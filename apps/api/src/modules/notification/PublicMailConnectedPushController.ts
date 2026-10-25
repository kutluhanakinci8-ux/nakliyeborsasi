import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { MailConnectedAccountsPushService } from "./MailConnectedAccountsPushService";

@Controller("public/mail-connected")
export class PublicMailConnectedPushController {
  public constructor(
    private readonly mailConnectedAccountsPushService: MailConnectedAccountsPushService,
  ) {}

  @Post("gmail/pubsub")
  public async gmailPubSub(@Body() body: Record<string, unknown>) {
    return this.mailConnectedAccountsPushService.handleGmailPubSub(body);
  }

  @Get("microsoft/graph")
  public microsoftGraphValidation(
    @Query("validationToken") validationToken?: string,
  ) {
    if (validationToken) {
      return validationToken;
    }
    return { ok: true };
  }

  @Post("microsoft/graph")
  public async microsoftGraph(
    @Body() body: Record<string, unknown>,
    @Query("validationToken") validationToken?: string,
  ) {
    const result =
      await this.mailConnectedAccountsPushService.handleMicrosoftGraphNotification(
        body,
        validationToken,
      );
    if (typeof result === "string") {
      return result;
    }
    return result;
  }
}
