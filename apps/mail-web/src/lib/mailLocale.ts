import { MAIL_WEB_MESSAGES } from "./mailWebLocale";

export type MailUiLocale = "tr" | "en";

export type MailTimeZoneId =
  | "Europe/Istanbul"
  | "UTC"
  | "Europe/London"
  | "Europe/Berlin";

export const STORAGE_LOCALE = "lerta-mail-ui-locale";
export const MAIL_UI_LOCALE_COOKIE = "lerta-mail-ui-locale";
const STORAGE_TZ = "lerta-mail-time-zone";

const MESSAGES: Record<MailUiLocale, Record<string, string>> = {
  tr: {
    loginBrand: "Lerta Posta",
    loginTag: "Kurumsal webmail",
    loginTitle: "Giriş",
    loginEmail: "E-posta",
    loginPassword: "Şifre",
    loginSubmit: "Giriş yap",
    loginError: "E-posta veya şifre hatalı. Kurumsal posta için firma hesabı gerekir.",
    localeTr: "Türkçe",
    localeEn: "English",
    regionalTitle: "Bölge ve dil",
    regionalHint: "Tarih/saat gösterimi ve arayüz dili",
    timeZoneLabel: "Saat dilimi",
    languageLabel: "Dil",
    spamFolderHint:
      "Microsoft veya Gmail bağlı hesaplarda İstenmeyen / Junk klasöründeki iletiler burada listelenir. Gelen kutusunda görmek için Outlook veya Gmail’de “Gelen”e taşıyın, sonra Yenile’ye basın.",
    pilotBillingTitle: "Pilot dönem — ödeme kapalı",
    pilotBillingBody:
      "Kurumsal plan ve canlı ödeme henüz açılmadı. Posta ve webmail kullanımınız pilot kapsamında devam eder. Plan ve faturalama için yönetim konsolunu kullanın.",
    pilotBillingConsoleLink: "Yönetim konsolu — planlar",
    pilotBillingDismiss: "Kapat",
  },
  en: {
    loginBrand: "Lerta Mail",
    loginTag: "Business webmail",
    loginTitle: "Sign in",
    loginEmail: "Email",
    loginPassword: "Password",
    loginSubmit: "Sign in",
    loginError: "Invalid email or password. A company account is required for business mail.",
    localeTr: "Türkçe",
    localeEn: "English",
    regionalTitle: "Region & language",
    regionalHint: "UI language and date/time display",
    timeZoneLabel: "Time zone",
    languageLabel: "Language",
    spamFolderHint:
      "Messages in Junk / Spam on connected Microsoft or Gmail accounts appear here. Move them to Inbox in Outlook or Gmail, then press Refresh.",
    pilotBillingTitle: "Pilot period — billing not live",
    pilotBillingBody:
      "Corporate plans and live checkout are not enabled yet. Your mail and webmail continue under the pilot program. Use the admin console for plans and billing.",
    pilotBillingConsoleLink: "Admin console — plans",
    pilotBillingDismiss: "Dismiss",
  },
};

export function parseMailUiLocale(raw: string | null | undefined): MailUiLocale {
  return raw === "en" ? "en" : "tr";
}

export function readMailUiLocale(): MailUiLocale {
  if (typeof window === "undefined") {
    return "tr";
  }
  try {
    const raw = localStorage.getItem(STORAGE_LOCALE);
    return raw === "en" ? "en" : "tr";
  } catch {
    return "tr";
  }
}

export function persistMailUiLocale(locale: MailUiLocale): void {
  try {
    localStorage.setItem(STORAGE_LOCALE, locale);
  } catch {
    /* ignore */
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale === "en" ? "en" : "tr";
  }
}

export function readMailTimeZone(): MailTimeZoneId {
  if (typeof window === "undefined") {
    return "Europe/Istanbul";
  }
  try {
    const raw = localStorage.getItem(STORAGE_TZ);
    if (
      raw === "UTC" ||
      raw === "Europe/London" ||
      raw === "Europe/Berlin" ||
      raw === "Europe/Istanbul"
    ) {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return "Europe/Istanbul";
}

export function persistMailTimeZone(zone: MailTimeZoneId): void {
  try {
    localStorage.setItem(STORAGE_TZ, zone);
  } catch {
    /* ignore */
  }
}

export function resolveInitialLocaleFromUrl(): MailUiLocale | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const lang = new URLSearchParams(window.location.search).get("lang");
    if (lang === "en" || lang === "tr") {
      return lang;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function resolveInitialMailUiLocale(): MailUiLocale {
  return resolveInitialLocaleFromUrl() ?? readMailUiLocale();
}

export function t(
  key: string,
  locale: MailUiLocale,
  params?: Record<string, string | number>,
): string {
  const raw =
    MESSAGES[locale][key] ??
    MAIL_WEB_MESSAGES[locale][key] ??
    MESSAGES.tr[key] ??
    MAIL_WEB_MESSAGES.tr[key] ??
    key;
  if (!params) {
    return raw;
  }
  return Object.entries(params).reduce(
    (acc, [name, value]) => acc.replaceAll(`{{${name}}}`, String(value)),
    raw,
  );
}

export function mailLocaleTag(locale: MailUiLocale): string {
  return locale === "en" ? "en-US" : "tr-TR";
}

export function formatMailDateTime(
  iso: string,
  locale: MailUiLocale,
  timeZone: MailTimeZoneId,
): string {
  return new Date(iso).toLocaleString(mailLocaleTag(locale), { timeZone });
}
