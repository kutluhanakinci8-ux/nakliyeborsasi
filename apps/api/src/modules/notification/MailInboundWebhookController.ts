import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { IsNumber, IsOptional, IsString, MinLength } from "class-validator";
import { MailInboundWebhookGuard } from "./MailInboundWebhookGuard";
import { MailInboundIngestService } from "./MailInboundIngestService";

class MailInboundWebhookDto {
  @IsString()
  @MinLength(3)
  public recipient!: string;

  @IsOptional()
  @IsString()
  public sender?: string;

  @IsOptional()
  @IsString()
  public subject?: string;

  @IsOptional()
  @IsString()
  public text?: string;

  @IsOptional()
  @IsString()
  public rawMime?: string;

  @IsOptional()
  @IsNumber()
  public rspamdScore?: number;

  @IsOptional()
  @IsString()
  public rspamdAction?: string;
}

@Controller("mail/inbound")
export class MailInboundWebhookController {
  public constructor(
    private readonly mailInboundIngestService: MailInboundIngestService,
  ) {}

  @Post("webhook")
  @UseGuards(MailInboundWebhookGuard)
  public async webhook(@Body() body: MailInboundWebhookDto) {
    const message = await this.mailInboundIngestService.ingest(body);
    return {
      ok: true,
      messageId: message.id,
      mailboxId: message.mailboxId,
      receivedAt: message.receivedAt.toISOString(),
    };
  }
}
