import { consolePath, CONSOLE_URL } from "./marketingUrls";

/** Yönetim konsolu destek talepleri (ticket) modülü. */
export const CONSOLE_SUPPORT_TICKETS_PATH = "/destek/talepler";

export const CONSOLE_SUPPORT_TICKETS_URL = consolePath(CONSOLE_SUPPORT_TICKETS_PATH);

export const CONSOLE_LOGIN_SUPPORT_NEXT = consolePath(
  `/login?next=${encodeURIComponent(CONSOLE_SUPPORT_TICKETS_PATH)}`,
);

export const CONSOLE_HOME_URL = CONSOLE_URL.replace(/\/$/, "");
