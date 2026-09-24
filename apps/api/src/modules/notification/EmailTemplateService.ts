import {
  PLATFORM_EMAIL_SUBJECT_TAG,
  PLATFORM_PRODUCT_NAME,
  PLATFORM_PRODUCT_NAME_UPPER,
} from "@nakliyeborsasi/core";
import { Injectable } from "@nestjs/common";
import { NotificationEventCode } from "./NotificationEventCode";

export type EmailTemplatePayload = Record<string, string>;

@Injectable()
export class EmailTemplateService {
  public render(
    eventCode: NotificationEventCode,
    locale: string,
    audience: "admin" | "user",
    payload: EmailTemplatePayload,
  ): { subject: string; html: string; text: string } {
    if (audience === "admin") {
      return this.renderAdminTr(eventCode, payload);
    }
    return locale === "en"
      ? this.renderUserEn(eventCode, payload)
      : this.renderUserTr(eventCode, payload);
  }

  private renderAdminTr(
    eventCode: NotificationEventCode,
    payload: EmailTemplatePayload,
  ): { subject: string; html: string; text: string } {
    switch (eventCode) {
      case NotificationEventCode.UserRegistered:
        return {
          subject: `[${PLATFORM_EMAIL_SUBJECT_TAG}] Yeni firma kaydı — ${payload.companyLegalName}`,
          html: this.wrapHtml(
            "Yeni firma kaydı",
            `<p><strong>${payload.displayName}</strong> platforma kayıt oldu.</p>
            <table style="border-collapse:collapse;width:100%;font-size:14px;">
              <tr><td style="padding:6px 0;color:#64748b;">Firma</td><td>${payload.companyLegalName}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;">E-posta</td><td>${payload.emailAddress}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;">Ülke</td><td>${payload.companyCountryCode}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;">Katılımcı tipi</td><td>${payload.participantType}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;">Plan</td><td>${payload.planCode}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;">Firma ID</td><td><code>${payload.companyId}</code></td></tr>
            </table>
            <p style="margin-top:16px;">Kayıt sonrası otomatik oturum açıldı (ilk giriş sayıldı).</p>`,
          ),
          text: `Yeni kayıt: ${payload.displayName} / ${payload.companyLegalName} (${payload.emailAddress})`,
        };
      case NotificationEventCode.UserLogin:
        return {
          subject: `[${PLATFORM_EMAIL_SUBJECT_TAG}] Giriş — ${payload.emailAddress}`,
          html: this.wrapHtml(
            "Kullanıcı girişi",
            `<p><strong>${payload.displayName}</strong> oturum açtı.</p>
            <p>Firma: ${payload.companyLegalName}<br/>
            IP: ${payload.ipAddress}<br/>
            Tarayıcı: ${payload.userAgent}<br/>
            Giriş #${payload.loginCount} · ${payload.occurredAt}</p>`,
          ),
          text: `Giriş: ${payload.emailAddress} (${payload.companyLegalName})`,
        };
      case NotificationEventCode.UserFirstLogin:
        return {
          subject: `[${PLATFORM_EMAIL_SUBJECT_TAG}] İlk giriş — ${payload.emailAddress}`,
          html: this.wrapHtml(
            "İlk giriş",
            `<p>${payload.emailAddress} ilk kez oturum açtı.</p>`,
          ),
          text: `İlk giriş: ${payload.emailAddress}`,
        };
      default:
        return {
          subject: `[${PLATFORM_EMAIL_SUBJECT_TAG}] Bildirim — ${eventCode}`,
          html: this.wrapHtml("Bildirim", `<pre>${JSON.stringify(payload)}</pre>`),
          text: eventCode,
        };
    }
  }

  private renderUserTr(
    eventCode: NotificationEventCode,
    payload: EmailTemplatePayload,
  ): { subject: string; html: string; text: string } {
    switch (eventCode) {
      case NotificationEventCode.UserRegistered:
        return {
          subject: `${PLATFORM_PRODUCT_NAME} — kaydınız alındı`,
          html: this.wrapHtml(
            "Hoş geldiniz",
            `<p>Merhaba ${payload.displayName},</p>
            <p><strong>${payload.companyLegalName}</strong> için kurumsal hesabınız oluşturuldu.</p>
            <p>Sonraki adım: organizasyon profilinizi tamamlayın ve doğrulama sürecini başlatın.</p>
            <p><a href="${payload.organizasyonUrl}">Benim organizasyonum</a></p>`,
          ),
          text: `Kaydınız alındı. ${payload.organizasyonUrl}`,
        };
      case NotificationEventCode.EmailVerification:
        return {
          subject: "E-posta adresinizi doğrulayın",
          html: this.wrapHtml(
            "E-posta doğrulama",
            `<p>Doğrulama bağlantısı (60 dk geçerli):</p>
            <p><a href="${payload.verifyUrl}">${payload.verifyUrl}</a></p>`,
          ),
          text: payload.verifyUrl ?? "",
        };
      case NotificationEventCode.PasswordReset:
        return {
          subject: "Şifre sıfırlama",
          html: this.wrapHtml(
            "Şifre sıfırlama",
            `<p><a href="${payload.resetUrl}">Şifrenizi sıfırlayın</a> (60 dk)</p>`,
          ),
          text: payload.resetUrl ?? "",
        };
      default:
        return {
          subject: PLATFORM_PRODUCT_NAME,
          html: this.wrapHtml("Bilgi", `<p>${payload.message ?? ""}</p>`),
          text: payload.message ?? "",
        };
    }
  }

  private renderUserEn(
    eventCode: NotificationEventCode,
    payload: EmailTemplatePayload,
  ): { subject: string; html: string; text: string } {
    switch (eventCode) {
      case NotificationEventCode.UserRegistered:
        return {
          subject: `${PLATFORM_PRODUCT_NAME} — registration received`,
          html: this.wrapHtml(
            "Welcome",
            `<p>Hello ${payload.displayName},</p>
            <p>Your company account <strong>${payload.companyLegalName}</strong> is ready.</p>
            <p><a href="${payload.organizasyonUrl}">My organization</a></p>`,
          ),
          text: `Registration received. ${payload.organizasyonUrl}`,
        };
      case NotificationEventCode.EmailVerification:
        return {
          subject: "Verify your email",
          html: this.wrapHtml(
            "Email verification",
            `<p><a href="${payload.verifyUrl}">Verify email</a></p>`,
          ),
          text: payload.verifyUrl ?? "",
        };
      case NotificationEventCode.PasswordReset:
        return {
          subject: "Password reset",
          html: this.wrapHtml(
            "Password reset",
            `<p><a href="${payload.resetUrl}">Reset password</a></p>`,
          ),
          text: payload.resetUrl ?? "",
        };
      default:
        return this.renderUserTr(eventCode, payload);
    }
  }

  private wrapHtml(title: string, body: string): string {
    return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#f8fafc;padding:24px;">
      <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;border:1px solid #e2e8f0;">
        <p style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#0d9488;margin:0 0 8px;">${PLATFORM_PRODUCT_NAME_UPPER}</p>
        <h1 style="font-size:20px;margin:0 0 16px;color:#0f2444;">${title}</h1>
        ${body}
      </div></body></html>`;
  }
}
