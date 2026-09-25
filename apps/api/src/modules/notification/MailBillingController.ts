import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { AuthenticatedUserParam } from "../auth/AuthenticatedUserParam";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { MailBillingService } from "./MailBillingService";
import { IsOptional, IsString, IsUrl, MaxLength } from "class-validator";

class MailBillingCheckoutDto {
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  public successUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  public cancelUrl?: string;
}

class IyzicoCallbackDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  public token?: string;
}

@Controller("company/mail-billing")
export class MailBillingController {
  public constructor(private readonly mailBillingService: MailBillingService) {}

  @Get("status")
  @UseGuards(JwtAuthenticationGuard)
  public async getStatus(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
  ) {
    void user;
    const status = await this.mailBillingService.getBillingStatus();
    return { message: "OK", status };
  }

  @Post("checkout/corporate")
  @UseGuards(JwtAuthenticationGuard)
  public async corporateCheckout(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: MailBillingCheckoutDto,
  ) {
    const result = await this.mailBillingService.createCorporateCheckout(user, {
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
    });
    return { message: "OK", ...result };
  }
}

@Controller("webhooks/mail-billing")
export class MailBillingWebhookController {
  public constructor(private readonly mailBillingService: MailBillingService) {}

  @Post("stripe")
  public async stripeWebhook(
    @Req() request: Request & { rawBody?: Buffer },
    @Headers("stripe-signature") signature?: string,
  ) {
    const rawBody = request.rawBody ?? Buffer.from("");
    return this.mailBillingService.handleStripeWebhook(rawBody, signature);
  }

  @Post("iyzico")
  public async iyzicoCallbackPost(
    @Body() body: IyzicoCallbackDto,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const token =
      body.token?.trim() ||
      (typeof request.body?.token === "string" ? request.body.token.trim() : "");
    await this.finishIyzicoCallback(token, response);
  }

  @Get("iyzico")
  public async iyzicoCallbackGet(
    @Query("token") token: string | undefined,
    @Res() response: Response,
  ) {
    await this.finishIyzicoCallback(token?.trim() ?? "", response);
  }

  private async finishIyzicoCallback(
    token: string,
    response: Response,
  ): Promise<void> {
    const successUrl = this.mailBillingService.consoleBillingSuccessUrl();
    const cancelUrl = this.mailBillingService.consoleBillingCancelUrl();
    try {
      const result = await this.mailBillingService.handleIyzicoCallback(token);
      if (result.ok) {
        response.redirect(302, successUrl);
        return;
      }
      response.redirect(302, `${cancelUrl}&reason=payment_${result.paymentStatus ?? "failed"}`);
    } catch {
      response.redirect(302, `${cancelUrl}&reason=callback_error`);
    }
  }
}
