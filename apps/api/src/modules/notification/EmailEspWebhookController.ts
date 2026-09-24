import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { EmailEspWebhookService } from "./EmailEspWebhookService";

@Controller("email/webhooks")
export class EmailEspWebhookController {
  public constructor(
    private readonly emailEspWebhookService: EmailEspWebhookService,
  ) {}

  @Post("postmark")
  @HttpCode(200)
  public async postmark(
    @Headers("x-postmark-webhook-token") token: string | undefined,
    @Body() body: Record<string, unknown>,
  ): Promise<{ ok: true }> {
    if (!this.emailEspWebhookService.verifyPostmarkToken(token)) {
      throw new UnauthorizedException("Invalid Postmark webhook token");
    }
    await this.emailEspWebhookService.handlePostmarkPayload(body);
    return { ok: true };
  }

  @Post("ses")
  @HttpCode(200)
  public async ses(@Body() body: Record<string, unknown>): Promise<{ ok: true }> {
    await this.emailEspWebhookService.handleSesNotification(body);
    return { ok: true };
  }
}
