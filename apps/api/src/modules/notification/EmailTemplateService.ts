import {
  PLATFORM_EMAIL_SUBJECT_TAG,
  PLATFORM_PRODUCT_NAME,
} from "@nakliyeborsasi/core";
import { Injectable } from "@nestjs/common";
import { NotificationEventCode } from "./NotificationEventCode";
import {
  detailTable,
  escapeHtml,
  formatOccurredAt,
  leadParagraph,
  mutedParagraph,
  primaryButton,
  wrapCorporateEmail,
} from "./EmailTemplateLayout";

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
          html: wrapCorporateEmail(
            "Yeni kurumsal kayıt",
            `${leadParagraph(
              `<strong>${escapeHtml(payload.displayName)}</strong> platforma kayıt oldu. Operasyon ekibinin incelemesi için özet bilgiler aşağıda.`,
            )}
            ${detailTable([
              { label: "Firma unvanı", value: payload.companyLegalName },
              { label: "E-posta", value: payload.emailAddress },
              { label: "Ülke", value: payload.companyCountryCode },
              { label: "Katılımcı tipi", value: payload.participantType },
              { label: "Plan", value: payload.planCode },
              { label: "Firma kimliği", value: payload.companyId },
            ])}
            ${mutedParagraph("Kayıt sonrası otomatik oturum açıldı; bu olay ilk giriş olarak da sayıldı.")}`,
            {
              eyebrow: "Platform yönetimi",
              preheader: `Yeni kayıt: ${payload.companyLegalName}`,
            },
          ),
          text: `Yeni kayıt: ${payload.displayName} / ${payload.companyLegalName} (${payload.emailAddress})`,
        };
      case NotificationEventCode.UserLogin:
        return {
          subject: `[${PLATFORM_EMAIL_SUBJECT_TAG}] Giriş — ${payload.emailAddress}`,
          html: wrapCorporateEmail(
            "Kullanıcı girişi",
            `${leadParagraph(
              `<strong>${escapeHtml(payload.displayName)}</strong> hesabına başarılı oturum açıldı.`,
            )}
            ${detailTable([
              { label: "Firma", value: payload.companyLegalName },
              { label: "E-posta", value: payload.emailAddress },
              { label: "IP adresi", value: payload.ipAddress },
              { label: "Tarayıcı / cihaz", value: payload.userAgent },
              {
                label: "Oturum",
                value: `Giriş #${payload.loginCount} · ${formatOccurredAt(payload.occurredAt)}`,
              },
            ])}
            ${mutedParagraph("Şüpheli bir giriş fark ederseniz kullanıcı hesabını dondurmayı değerlendirin.")}`,
            {
              eyebrow: "Güvenlik ve erişim",
              preheader: `Giriş: ${payload.emailAddress}`,
            },
          ),
          text: `Giriş: ${payload.emailAddress} (${payload.companyLegalName})`,
        };
      case NotificationEventCode.AuctionBidPlaced:
      case NotificationEventCode.AuctionOutbid:
      case NotificationEventCode.AuctionWon:
      case NotificationEventCode.AuctionPublished:
      case NotificationEventCode.ListingNewOffer:
      case NotificationEventCode.MessagingNewMessage:
        return this.renderOperationalAdminTr(eventCode, payload);
      case NotificationEventCode.UserFirstLogin:
        return {
          subject: `[${PLATFORM_EMAIL_SUBJECT_TAG}] İlk giriş — ${payload.emailAddress}`,
          html: wrapCorporateEmail(
            "İlk platform girişi",
            `${leadParagraph(
              `${escapeHtml(payload.emailAddress)} adresi platformda <strong>ilk kez</strong> oturum açtı.`,
            )}
            ${detailTable([
              { label: "Firma", value: payload.companyLegalName ?? "—" },
              { label: "Zaman", value: formatOccurredAt(payload.occurredAt ?? "") },
            ])}`,
            { eyebrow: "Aktivasyon", preheader: `İlk giriş: ${payload.emailAddress}` },
          ),
          text: `İlk giriş: ${payload.emailAddress}`,
        };
      default:
        return {
          subject: `[${PLATFORM_EMAIL_SUBJECT_TAG}] Bildirim — ${eventCode}`,
          html: wrapCorporateEmail(
            "Sistem bildirimi",
            mutedParagraph(escapeHtml(JSON.stringify(payload))),
            { eyebrow: "Sistem" },
          ),
          text: eventCode,
        };
    }
  }

  private renderUserTr(
    eventCode: NotificationEventCode,
    payload: EmailTemplatePayload,
  ): { subject: string; html: string; text: string } {
    switch (eventCode) {
      case NotificationEventCode.AuctionBidPlaced:
      case NotificationEventCode.AuctionOutbid:
      case NotificationEventCode.AuctionWon:
      case NotificationEventCode.AuctionPublished:
      case NotificationEventCode.ListingNewOffer:
      case NotificationEventCode.MessagingNewMessage:
        return this.renderOperationalAdminTr(eventCode, payload);
      case NotificationEventCode.UserRegistered:
        return {
          subject: `${PLATFORM_PRODUCT_NAME} — kaydınız alındı`,
          html: wrapCorporateEmail(
            "Hoş geldiniz",
            `${leadParagraph(`Merhaba ${escapeHtml(payload.displayName)},`)}
            ${leadParagraph(
              `<strong>${escapeHtml(payload.companyLegalName)}</strong> için kurumsal hesabınız oluşturuldu. Koridor genelinde ilan, ihale ve iş birliği araçlarına tek giriş noktasından erişebilirsiniz.`,
            )}
            ${primaryButton(payload.organizasyonUrl, "Organizasyon profilini tamamla")}
            ${mutedParagraph("Profilinizi tamamladığınızda doğrulama sürecini başlatabilirsiniz.")}`,
            {
              eyebrow: "Kurumsal üyelik",
              preheader: "Kaydınız alındı — sonraki adımlar",
              badge: "Hoş geldiniz",
            },
          ),
          text: `Kaydınız alındı. ${payload.organizasyonUrl}`,
        };
      case NotificationEventCode.EmailVerification:
        return {
          subject: "E-posta adresinizi doğrulayın",
          html: wrapCorporateEmail(
            "E-posta doğrulama",
            `${leadParagraph("Hesabınızın güvenliği için e-posta adresinizi doğrulamanız gerekiyor.")}
            ${primaryButton(payload.verifyUrl ?? "#", "E-postamı doğrula")}
            ${mutedParagraph("Bağlantı 60 dakika geçerlidir. Bu işlemi siz yapmadıysanız bu e-postayı yok sayın.")}`,
            { eyebrow: "Güvenlik", preheader: "Doğrulama bağlantınız hazır" },
          ),
          text: payload.verifyUrl ?? "",
        };
      case NotificationEventCode.PasswordReset:
        return {
          subject: "Şifre sıfırlama",
          html: wrapCorporateEmail(
            "Şifrenizi sıfırlayın",
            `${leadParagraph("Şifre sıfırlama talebi alındı. Yeni şifre belirlemek için aşağıdaki düğmeyi kullanın.")}
            ${primaryButton(payload.resetUrl ?? "#", "Yeni şifre oluştur")}
            ${mutedParagraph("Bağlantı 60 dakika geçerlidir. Talebi siz yapmadıysanız şifreniz değişmeyecektir.")}`,
            { eyebrow: "Güvenlik", preheader: "Şifre sıfırlama bağlantısı" },
          ),
          text: payload.resetUrl ?? "",
        };
      case NotificationEventCode.MailTeamInvite:
        return {
          subject: `Lerta Mail — ${payload.companyLegalName ?? "ekip daveti"}`,
          html: wrapCorporateEmail(
            "Ekibe davet edildiniz",
            `${leadParagraph(
              `<strong>${escapeHtml(payload.companyLegalName ?? "Firma")}</strong> sizi Lerta Mail yönetim konsoluna <strong>${escapeHtml(payload.roleLabel ?? "")}</strong> rolüyle davet etti.`,
            )}
            ${primaryButton(payload.inviteUrl ?? "#", "Daveti kabul et")}
            ${mutedParagraph("Bağlantı 7 gün geçerlidir. Bu daveti beklemiyorsanız e-postayı yok sayın.")}`,
            {
              eyebrow: "Lerta Mail",
              preheader: "Yönetim konsolu daveti",
            },
          ),
          text: payload.inviteUrl ?? "",
        };
      default:
        return {
          subject: PLATFORM_PRODUCT_NAME,
          html: wrapCorporateEmail(
            "Bilgilendirme",
            leadParagraph(escapeHtml(payload.message ?? "")),
            { eyebrow: "Bildirim" },
          ),
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
          html: wrapCorporateEmail(
            "Welcome",
            `${leadParagraph(`Hello ${escapeHtml(payload.displayName)},`)}
            ${leadParagraph(
              `Your company account <strong>${escapeHtml(payload.companyLegalName)}</strong> is ready.`,
            )}
            ${primaryButton(payload.organizasyonUrl, "Complete organization profile")}`,
            { eyebrow: "Corporate membership", badge: "Welcome" },
          ),
          text: `Registration received. ${payload.organizasyonUrl}`,
        };
      case NotificationEventCode.EmailVerification:
        return {
          subject: "Verify your email",
          html: wrapCorporateEmail(
            "Email verification",
            primaryButton(payload.verifyUrl ?? "#", "Verify email"),
            { eyebrow: "Security" },
          ),
          text: payload.verifyUrl ?? "",
        };
      case NotificationEventCode.PasswordReset:
        return {
          subject: "Password reset",
          html: wrapCorporateEmail(
            "Reset your password",
            primaryButton(payload.resetUrl ?? "#", "Reset password"),
            { eyebrow: "Security" },
          ),
          text: payload.resetUrl ?? "",
        };
      default:
        return this.renderUserTr(eventCode, payload);
    }
  }

  private renderOperationalAdminTr(
    eventCode: NotificationEventCode,
    payload: EmailTemplatePayload,
  ): { subject: string; html: string; text: string } {
    const titles: Partial<Record<NotificationEventCode, string>> = {
      [NotificationEventCode.AuctionBidPlaced]: "İhalede yeni teklif",
      [NotificationEventCode.AuctionOutbid]: "Teklifiniz geçildi",
      [NotificationEventCode.AuctionWon]: "İhale kazanıldı",
      [NotificationEventCode.AuctionPublished]: "Yeni ihale yayınlandı",
      [NotificationEventCode.ListingNewOffer]: "Yeni teklif / ilan",
      [NotificationEventCode.MessagingNewMessage]: "Yeni mesaj",
    };
    const title = titles[eventCode] ?? "Operasyon bildirimi";
    const auctionUrl = payload.auctionUrl ?? "#";
    return {
      subject: `[${PLATFORM_EMAIL_SUBJECT_TAG}] ${title} — ${payload.companyLegalName ?? ""}`,
      html: wrapCorporateEmail(
        title,
        `${leadParagraph(
          `<strong>${escapeHtml(payload.bidderCompanyName ?? payload.displayName ?? "—")}</strong> · ${escapeHtml(payload.bidAmount ?? "")}`,
        )}
        ${detailTable([
          { label: "Firma", value: payload.companyLegalName ?? "—" },
          { label: "İhale", value: payload.auctionSessionId ?? "—" },
          { label: "Zaman", value: formatOccurredAt(payload.occurredAt ?? "") },
        ])}
        ${primaryButton(auctionUrl, "İhaleyi aç")}`,
        { eyebrow: "Operasyon", preheader: title },
      ),
      text: `${title}: ${payload.auctionSessionId ?? ""} ${auctionUrl}`,
    };
  }
}
