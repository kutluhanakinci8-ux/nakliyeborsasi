/** Mail web oturum anahtarı — session provider ile aynı. */
export const MAIL_ACCESS_TOKEN_STORAGE_KEY = "lerta_mail_access_token";

export function readMailAccessToken(): string | null {
  try {
    return localStorage.getItem(MAIL_ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}
