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
    if (!result.ok || !result.organizationId) {
      res.status(400).type("html").send(renderHtml(false));
      return;
    }
    const branding =
      await this.mailMarketingUnsubscribeService.resolveUnsubscribeBranding(
        result.organizationId,
      );
    res
      .status(200)
      .type("html")
      .send(renderHtml(true, result.alreadySuppressed, branding));
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

function renderHtml(
  success: boolean,
  alreadySuppressed?: boolean,
  branding?: { brandTitle: string; logoUrl: string | null; accentColor: string },
): string {
  const title = success ? "Abonelik iptali" : "İşlem başarısız";
  const body = success
    ? alreadySuppressed
      ? "Bu adres zaten bülten listesinden çıkmıştı."
      : "Bülten ve pazarlama e-postalarından başarıyla çıktınız. İşleminiz kayıt altına alındı (KVKK)."
    : "Bağlantı geçersiz veya süresi dolmuş.";
  const brand = branding?.brandTitle ?? "Lerta Posta";
  const accent = branding?.accentColor ?? "#1a1647";
  const logo = branding?.logoUrl?.trim();
  const logoBlock = logo
    ? `<img src="${escapeAttr(logo)}" alt="" width="48" height="48" style="border-radius:8px;margin-bottom:16px" />`
    : "";
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(title)}</title></head><body style="font-family:system-ui,sans-serif;margin:0;background:#f4f5f9;padding:32px 16px"><div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;border:1px solid #e2e5ec"><div style="background:${escapeAttr(accent)};color:#fff;padding:16px 20px;border-radius:12px;margin:-8px -8px 20px"><strong>${escapeHtml(brand)}</strong></div>${logoBlock}<h1 style="font-size:22px;margin:0 0 12px">${escapeHtml(title)}</h1><p style="line-height:1.55;color:#333">${escapeHtml(body)}</p><p style="font-size:12px;color:#888;margin-top:24px">Kurumsal e-posta · Lerta Posta</p></div></body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, "&#39;");
}
