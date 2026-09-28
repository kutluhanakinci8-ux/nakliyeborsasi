import { Body, Controller, Headers, Post } from "@nestjs/common";
import { MessagingBotApplicationService } from "./MessagingBotApplicationService";

@Controller("messaging/bot")
export class MessagingBotIncomingController {
  public constructor(
    private readonly messagingBotApplicationService: MessagingBotApplicationService,
  ) {}

  @Post("incoming")
  public async incoming(
    @Headers("x-messaging-bot-token") headerToken: string | undefined,
    @Body()
    body: {
      webhookToken?: string;
      channelSlug: string;
      text: string;
      botName?: string;
    },
  ) {
    const webhookToken = (headerToken ?? body.webhookToken ?? "").trim();
    const result =
      await this.messagingBotApplicationService.postIncomingBotMessage({
        webhookToken,
        channelSlug: body.channelSlug,
        text: body.text,
        botName: body.botName,
      });
    return { ok: true, ...result };
  }
}
