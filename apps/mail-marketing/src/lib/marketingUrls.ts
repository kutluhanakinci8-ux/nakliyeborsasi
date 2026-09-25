export const CONSOLE_URL =
  process.env.NEXT_PUBLIC_CONSOLE_URL ?? "https://yonetim.lerta.com.tr";
export const MAIL_WEB_URL =
  process.env.NEXT_PUBLIC_MAIL_WEB_URL ?? "https://posta.lerta.com.tr";

export function consolePath(path: string): string {
  return `${CONSOLE_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export const CORPORATE_REGISTER = consolePath(
  "/register?plan=lerta_mail_corporate_tr",
);
export const PILOT_REGISTER = consolePath("/register?plan=lerta_mail_pilot_tr");
