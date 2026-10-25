import { Body, Controller, Post } from "@nestjs/common";
import { EmailOutboxService } from "./EmailOutboxService";
import { EmailRecipientKind, NotificationEventCode } from "./NotificationEventCode";
import { NotificationConfigurationService } from "./NotificationConfigurationService";
import { PublicPlatformContactRequestDto } from "./PublicPlatformContactRequestDto";

@Controller("public/platform")
export class PublicPlatformContactController {
  public constructor(
    private readonly emailOutboxService: EmailOutboxService,
    private readonly notificationConfigurationService: NotificationConfigurationService,
  ) {}

  @Post("contact")
  public async submitContact(
    @Body() body: PublicPlatformContactRequestDto,
  ): Promise<{ ok: true }> {
    const inbox = this.notificationConfigurationService.resolvePlatformInboxEmail();
    const payload: Record<string, string> = {
      name: body.name.trim(),
      emailAddress: body.email.trim().toLowerCase(),
      company: body.company?.trim() ?? "—",
      topic: body.topic,
      message: body.message.trim(),
      occurredAt: new Date().toISOString(),
    };
    const idempotencyKey = `CONTACT:${body.email}:${Date.now()}`;
    await this.emailOutboxService.enqueue({
      eventCode: NotificationEventCode.PlatformContactFormSubmitted,
      recipientKind: EmailRecipientKind.Admin,
      recipientEmail: inbox,
      locale: "tr",
      payload,
      idempotencyKey,
      metadata: { source: "public-contact-form" },
    });
    return { ok: true };
  }
}
