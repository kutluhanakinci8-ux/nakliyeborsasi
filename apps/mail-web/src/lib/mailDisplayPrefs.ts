export type MailReadFontScale = "default" | "large";

const THREAD_KEY = "lerta-mail-thread-view";
const FONT_KEY = "lerta-mail-read-font";

export const MAIL_READ_FONT_SCALE_CHANGE_EVENT =
  "lerta-mail-read-font-scale-change";

const LARGE_HTML_STYLE =
  '<style data-lerta-read-font="large">html{font-size:112%;}body{font-size:1rem;line-height:1.65;-webkit-text-size-adjust:100%;}p,li,td,div,span{font-size:inherit;}</style>';

export function readThreadViewPreference(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return localStorage.getItem(THREAD_KEY) === "1";
}

export function writeThreadViewPreference(enabled: boolean): void {
  localStorage.setItem(THREAD_KEY, enabled ? "1" : "0");
}

export function readReadFontScale(): MailReadFontScale {
  if (typeof window === "undefined") {
    return "default";
  }
  const v = localStorage.getItem(FONT_KEY);
  return v === "large" ? "large" : "default";
}

function notifyReadFontScaleChange(scale: MailReadFontScale): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent(MAIL_READ_FONT_SCALE_CHANGE_EVENT, { detail: { scale } }),
  );
}

export function applyReadFontScale(scale: MailReadFontScale): void {
  if (scale === "large") {
    document.documentElement.dataset.mailReadFont = "large";
  } else {
    delete document.documentElement.dataset.mailReadFont;
  }
  localStorage.setItem(FONT_KEY, scale);
  notifyReadFontScaleChange(scale);
}

export function initReadFontScale(): MailReadFontScale {
  const scale = readReadFontScale();
  applyReadFontScale(scale);
  return scale;
}

/** HTML e-posta iframe içeriğine büyük okuma alanı stilleri ekler. */
export function applyReadFontScaleToHtml(
  html: string,
  scale: MailReadFontScale = readReadFontScale(),
): string {
  if (scale !== "large" || !html.trim()) {
    return html;
  }
  if (html.includes('data-lerta-read-font="large"')) {
    return html;
  }
  if (/<head[\s>]/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${LARGE_HTML_STYLE}`);
  }
  if (/<html[\s>]/i.test(html)) {
    return html.replace(
      /<html([^>]*)>/i,
      `<html$1><head>${LARGE_HTML_STYLE}</head>`,
    );
  }
  return `${LARGE_HTML_STYLE}${html}`;
}
