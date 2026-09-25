import {
  Body,
  Controller,
  Headers,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
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

@Controller("company/mail-billing")
export class MailBillingController {
  public constructor(private readonly mailBillingService: MailBillingService) {}

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
}
