import { Body, Controller, Post } from "@nestjs/common";

/** CAP-5: Gmail Pub/Sub ve Graph webhook girişleri (prod yapılandırma sonrası işlenir). */
@Controller("public/mail-connected")
export class PublicMailConnectedPushController {
  @Post("gmail/pubsub")
  public async gmailPubSub(@Body() _body: Record<string, unknown>) {
    return { ok: true, accepted: true };
  }

  @Post("microsoft/graph")
  public async microsoftGraph(@Body() _body: Record<string, unknown>) {
    return { ok: true, accepted: true };
  }
}
