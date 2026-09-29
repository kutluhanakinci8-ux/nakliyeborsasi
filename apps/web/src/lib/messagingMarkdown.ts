/**
 * Kısıtlı markdown → güvenli HTML (XSS kaçınır).
 */
export function renderMessagingMarkdown(source: string): string {
  const escaped = escapeHtml(source);
  let html = escaped;

  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(
    /^- (.+)$/gm,
    '<span class="chat-md-li">• $1</span>',
  );
  html = html.replace(/\n/g, "<br />");
  return html;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
