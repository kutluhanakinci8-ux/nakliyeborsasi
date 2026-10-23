import type { MailRemoteImagesPolicy } from "./mailApi";

const IMG_SRC_RE =
  /(<img\b[^>]*\ssrc\s*=\s*)(["'])(https?:[^"']+)(["'])/gi;

export function applyRemoteImagesPolicyToHtml(
  html: string,
  policy: MailRemoteImagesPolicy,
  revealRemoteImages: boolean,
): string {
  if (policy === "show" || revealRemoteImages) {
    return html;
  }
  if (policy === "hide") {
    return html.replace(
      IMG_SRC_RE,
      '$1$2data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7$4',
    );
  }
  return html.replace(
    IMG_SRC_RE,
    '$1$2data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7$4 data-lerta-blocked-src=$4$4',
  );
}

const REMOTE_IMG_TEST =
  /<img\b[^>]*\ssrc\s*=\s*["']https?:/i;

export function htmlHasBlockedRemoteImages(
  html: string,
  policy: MailRemoteImagesPolicy,
  revealRemoteImages: boolean,
): boolean {
  return (
    policy === "ask" && !revealRemoteImages && REMOTE_IMG_TEST.test(html)
  );
}
