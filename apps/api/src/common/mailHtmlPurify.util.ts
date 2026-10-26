import DOMPurify from "isomorphic-dompurify";

const MAX_HTML_CHARS = 500_000;

const INBOUND_CONFIG: Parameters<typeof DOMPurify.sanitize>[1] = {
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
  ADD_ATTR: ["target", "rel"],
};

const OUTBOUND_CONFIG: Parameters<typeof DOMPurify.sanitize>[1] = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ["script", "iframe", "object", "embed", "form"],
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
};

function trimInput(html: string): string {
  return html.slice(0, MAX_HTML_CHARS);
}

/** Gelen posta HTML — XSS / aktif içerik temizliği (DOMPurify). */
export function sanitizeInboundHtmlWithPurify(html: string): string {
  return DOMPurify.sanitize(trimInput(html), INBOUND_CONFIG).trim();
}

/** Giden posta / imza HTML — script ve event handler yok. */
export function sanitizeOutboundHtmlWithPurify(html: string): string {
  return DOMPurify.sanitize(trimInput(html), OUTBOUND_CONFIG).trim();
}
