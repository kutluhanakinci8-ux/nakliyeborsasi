import { buildMailWebSsoHandoffUrl, resolveMailWebPublicUrl } from "./MailWebUrl";

/** Posta Ayarlar → Açık kaynak lisansları (W1–W8 kataloğu). */
export function resolveOpenSourceLicensesMailUrl(accessToken?: string | null): string {
  const base = resolveMailWebPublicUrl();
  if (accessToken?.trim()) {
    return buildMailWebSsoHandoffUrl(accessToken, {
      mailSettingsTab: "openSourceLicenses",
    });
  }
  return `${base}/login`;
}
