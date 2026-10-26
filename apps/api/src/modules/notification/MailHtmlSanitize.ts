import { sanitizeInboundHtmlWithPurify } from "../../common/mailHtmlPurify.util";

export function sanitizeInboundHtml(html: string): string {
  return sanitizeInboundHtmlWithPurify(html);
}
