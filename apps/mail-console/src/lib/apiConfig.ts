export function resolveApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (configured?.trim()) {
    return configured.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/v1`;
  }
  return "http://127.0.0.1:3010/api/v1";
}

export const MAIL_WEB_URL =
  process.env.NEXT_PUBLIC_MAIL_WEB_URL ?? "https://posta.lerta.com.tr";
