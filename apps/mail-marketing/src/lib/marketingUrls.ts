export const CONSOLE_URL =
  process.env.NEXT_PUBLIC_CONSOLE_URL ?? "https://yonetim.lerta.com.tr";
export const MAIL_WEB_URL =
  process.env.NEXT_PUBLIC_MAIL_WEB_URL ?? "https://posta.lerta.com.tr";

export const U88_APP_URL =
  process.env.NEXT_PUBLIC_U88_APP_URL ?? "https://u88.lerta.com.tr";

/** Mesaj — yalnızca u88 host (app.lerta.com.tr lojistik, kullanılmaz). */
export const MESSAGING_APP_URL =
  "https://u88.lerta.com.tr/messaging?tab=sohbet";

export const MESSAGING_LOGIN_URL =
  "https://u88.lerta.com.tr/login?next=%2Fmessaging%3Ftab%3Dsohbet";

export function consolePath(path: string): string {
  return `${CONSOLE_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export const CORPORATE_REGISTER = consolePath(
  "/register?plan=lerta_mail_corporate_tr",
);
export const PILOT_REGISTER = consolePath("/register?plan=lerta_mail_pilot_tr");
