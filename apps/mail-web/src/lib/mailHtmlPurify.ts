import DOMPurify from "isomorphic-dompurify";

const READ_CONFIG: Parameters<typeof DOMPurify.sanitize>[1] = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: [
    "script",
    "iframe",
    "object",
    "embed",
    "form",
    "meta",
    "link",
    "base",
  ],
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
  ADD_ATTR: ["target", "rel", "data-lerta-blocked-src"],
};

/** İstemci okuma görünümü — API sanitize sonrası ikinci katman. */
export function sanitizeMailHtmlForRead(html: string): string {
  const capped = html.slice(0, 500_000);
  return DOMPurify.sanitize(capped, READ_CONFIG);
}
