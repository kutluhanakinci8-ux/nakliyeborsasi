import { Controller, Get, Post, Query, Res } from "@nestjs/common";
import { Response } from "express";
import { MailMarketingUnsubscribeService } from "./MailMarketingUnsubscribeService";

@Controller("public/lerta-mail")
export class PublicMailMarketingUnsubscribeController {
  public constructor(
    private readonly mailMarketingUnsubscribeService: MailMarketingUnsubscribeService,
  ) {}

  @Get("marketing-unsubscribe")
  public async unsubscribeGet(
    @Query("token") token: string,
    @Res() res: Response,
  ) {
    const result = await this.mailMarketingUnsubscribeService.processToken(
      token?.trim() ?? "",
    );
    if (!result.ok) {
      res.status(400).type("html").send(renderHtml(false));
      return;
    }
    res.status(200).type("html").send(renderHtml(true, result.alreadySuppressed));
  }

  @Post("marketing-unsubscribe")
  public async unsubscribePost(
    @Query("token") token: string,
    @Res() res: Response,
  ) {
    const result = await this.mailMarketingUnsubscribeService.processToken(
      token?.trim() ?? "",
    );
    if (!result.ok) {
      res.status(400).json({ ok: false });
      return;
    }
    res.status(200).json({ ok: true, alreadySuppressed: result.alreadySuppressed });
  }
}

function renderHtml(success: boolean, alreadySuppressed?: boolean): string {
  const title = success ? "Abonelik iptali" : "İşlem başarısız";
  const body = success
    ? alreadySuppressed
      ? "Bu adres zaten bülten listesinden çıkmıştı."
      : "Bülten ve pazarlama e-postalarından başarıyla çıktınız."
    : "Bağlantı geçersiz veya süresi dolmuş.";
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title></head><body style="font-family:system-ui,sans-serif;padding:32px;max-width:480px;margin:0 auto;"><h1>${title}</h1><p>${body}</p></body></html>`;
}
