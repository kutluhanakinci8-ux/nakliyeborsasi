const CONSOLE_URL =
  process.env.NEXT_PUBLIC_CONSOLE_URL ?? "https://yonetim.lerta.com.tr";

export const MAIL_PILOT_REGISTER = `${CONSOLE_URL.replace(/\/$/, "")}/register?plan=lerta_mail_pilot_tr`;
export const MAIL_CORPORATE_REGISTER = `${CONSOLE_URL.replace(/\/$/, "")}/register?plan=lerta_mail_corporate_tr`;
export const MAIL_CONSOLE_LOGIN = `${CONSOLE_URL.replace(/\/$/, "")}/login`;
