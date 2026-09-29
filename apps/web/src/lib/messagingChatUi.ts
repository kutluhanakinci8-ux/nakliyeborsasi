export function companyInitials(label: string): string {
  const cleaned = label.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü0-9\s]/g, " ").trim();
  if (!cleaned) {
    return "?";
  }
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function formatChatDayLabel(iso: string, locale: string): string {
  const date = new Date(iso);
  const today = new Date();
  const startOfDay = (value: Date): number =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const diffDays = Math.round(
    (startOfDay(today) - startOfDay(date)) / (24 * 60 * 60 * 1000),
  );
  if (diffDays === 0) {
    return "Bugün";
  }
  if (diffDays === 1) {
    return "Dün";
  }
  return date.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

export function dayKeyFromIso(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function highlightSearchSnippet(
  snippet: string,
  query: string,
): string {
  const term = query.trim();
  if (!term || term.length < 2) {
    return snippet;
  }
  const lower = snippet.toLowerCase();
  const idx = lower.indexOf(term.toLowerCase());
  if (idx < 0) {
    return snippet;
  }
  const before = snippet.slice(0, idx);
  const match = snippet.slice(idx, idx + term.length);
  const after = snippet.slice(idx + term.length);
  return `${before}«${match}»${after}`;
}
