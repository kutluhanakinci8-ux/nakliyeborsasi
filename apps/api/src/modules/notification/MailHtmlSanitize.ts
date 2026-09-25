const BLOCKED_TAGS =
  /<\/?(?:script|iframe|object|embed|form|meta|link|base)[^>]*>/gi;

export function sanitizeInboundHtml(html: string): string {
  let out = html.slice(0, 500_000);
  out = out.replace(BLOCKED_TAGS, "");
  out = out.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  out = out.replace(/javascript:/gi, "");
  out = out.replace(/data:(?!image\/(?:png|jpeg|gif|webp);)/gi, "blocked:");
  return out.trim();
}
