import { escapeLtrHtml } from "./ltrEscapeHtml";
import type { LtrBlockBase, LtrManifest } from "./ltrManifestTypes";

function renderMarkdown(md: string): string {
  const lines = md.split(/\n/);
  const parts: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    if (trimmed.startsWith("## ")) {
      parts.push(`<h2>${escapeLtrHtml(trimmed.slice(3))}</h2>`);
      continue;
    }
    if (trimmed.startsWith("### ")) {
      parts.push(`<h3>${escapeLtrHtml(trimmed.slice(4))}</h3>`);
      continue;
    }
    let html = escapeLtrHtml(trimmed);
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
    parts.push(`<p>${html}</p>`);
  }
  return parts.join("\n");
}

function renderBlock(block: LtrBlockBase): string {
  const row = block as Record<string, unknown>;
  switch (row.type) {
    case "markdown":
      return renderMarkdown(String(row.md ?? ""));
    case "callout": {
      const tone = String(row.tone ?? "info");
      return `<div class="ltr-callout ltr-callout--${escapeLtrHtml(tone)}">${escapeLtrHtml(String(row.text ?? ""))}</div>`;
    }
    case "kpis": {
      const items = Array.isArray(row.items) ? row.items : [];
      const cells = items
        .map((item) => {
          const o = item as Record<string, unknown>;
          const value = escapeLtrHtml(String(o.value ?? ""));
          const label = escapeLtrHtml(String(o.label ?? ""));
          const delta = o.delta ? `<span class="ltr-kpi-delta">${escapeLtrHtml(String(o.delta))}</span>` : "";
          return `<div class="ltr-kpi"><strong>${value}</strong><span>${label}${delta}</span></div>`;
        })
        .join("");
      return `<div class="ltr-kpis">${cells}</div>`;
    }
    case "table": {
      const title = row.title ? `<h2>${escapeLtrHtml(String(row.title))}</h2>` : "";
      const columns = Array.isArray(row.columns) ? (row.columns as string[]) : [];
      const rows = Array.isArray(row.rows) ? (row.rows as string[][]) : [];
      const head = columns.map((c) => `<th>${escapeLtrHtml(c)}</th>`).join("");
      const body = rows
        .map(
          (r) =>
            `<tr>${r.map((cell) => `<td>${escapeLtrHtml(String(cell))}</td>`).join("")}</tr>`,
        )
        .join("");
      return `${title}<table class="ltr-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
    }
    case "quote":
      return `<blockquote class="ltr-quote">${escapeLtrHtml(String(row.text ?? ""))}${
        row.cite ? `<cite>${escapeLtrHtml(String(row.cite))}</cite>` : ""
      }</blockquote>`;
    case "section": {
      const title = row.title ? `<h2>${escapeLtrHtml(String(row.title))}</h2>` : "";
      const nested = Array.isArray(row.blocks)
        ? (row.blocks as LtrBlockBase[]).map(renderBlock).join("\n")
        : "";
      return `<section class="ltr-section">${title}${nested}</section>`;
    }
    default:
      return `<p class="ltr-unknown">[${escapeLtrHtml(String(row.type))}]</p>`;
  }
}

export function renderLtrBlocksHtml(manifest: LtrManifest): string {
  return manifest.blocks.map(renderBlock).join("\n");
}

const LTR_VIEWER_STYLES = `
:root { color-scheme: light dark; --ltr-bg: #f6f7f9; --ltr-fg: #1a1d23; --ltr-muted: #5c6370; --ltr-accent: #0b5cab; --ltr-card: #fff; --ltr-border: #dfe3ea; }
@media (prefers-color-scheme: dark) {
  :root { --ltr-bg: #121418; --ltr-fg: #eef0f4; --ltr-muted: #9aa3b2; --ltr-accent: #5ba4ff; --ltr-card: #1c1f26; --ltr-border: #2e3440; }
}
body { margin: 0; font-family: system-ui, sans-serif; background: var(--ltr-bg); color: var(--ltr-fg); line-height: 1.5; }
.ltr-wrap { max-width: 720px; margin: 0 auto; padding: 2rem 1.25rem 3rem; }
.ltr-eyebrow { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ltr-muted); }
.ltr-title { font-size: 1.75rem; margin: 0.25rem 0; }
.ltr-sub { color: var(--ltr-muted); margin: 0 0 1.25rem; }
.ltr-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.75rem; margin: 1rem 0; }
.ltr-kpi { background: var(--ltr-card); border: 1px solid var(--ltr-border); border-radius: 8px; padding: 0.75rem; }
.ltr-kpi strong { display: block; font-size: 1.25rem; color: var(--ltr-accent); }
.ltr-kpi span { font-size: 0.8rem; color: var(--ltr-muted); }
.ltr-callout { border-left: 4px solid var(--ltr-accent); padding: 0.75rem 1rem; background: var(--ltr-card); border-radius: 0 8px 8px 0; margin: 1rem 0; }
.ltr-table { width: 100%; border-collapse: collapse; background: var(--ltr-card); border: 1px solid var(--ltr-border); border-radius: 8px; overflow: hidden; margin: 1rem 0; }
.ltr-table th, .ltr-table td { padding: 0.6rem 0.75rem; text-align: left; border-bottom: 1px solid var(--ltr-border); }
.ltr-table th { background: var(--ltr-bg); font-size: 0.85rem; }
.ltr-quote { margin: 1.5rem 0; padding: 1rem; border-radius: 8px; background: var(--ltr-card); border: 1px solid var(--ltr-border); }
.ltr-quote cite { display: block; margin-top: 0.5rem; font-size: 0.85rem; color: var(--ltr-muted); }
.ltr-section { margin: 1.5rem 0; }
`;

/** Tam HTML belge — SDK, WebView ve yazdırma için. */
export function renderLtrDocumentHtml(manifest: LtrManifest): string {
  const body = renderLtrBlocksHtml(manifest);
  const subtitle = manifest.subtitle
    ? `<p class="ltr-sub">${escapeLtrHtml(manifest.subtitle)}</p>`
    : "";
  return `<!doctype html>
<html lang="${escapeLtrHtml(manifest.lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="ltr" content="1.0">
<title>${escapeLtrHtml(manifest.title)}</title>
<style>${LTR_VIEWER_STYLES}</style>
</head>
<body>
<div class="ltr-wrap">
<header>
<p class="ltr-eyebrow">Lerta Document · ${escapeLtrHtml(manifest.mode)}</p>
<h1 class="ltr-title">${escapeLtrHtml(manifest.title)}</h1>
${subtitle}
</header>
${body}
</div>
</body>
</html>`;
}
