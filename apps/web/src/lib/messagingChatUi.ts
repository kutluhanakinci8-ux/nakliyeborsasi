export type MessagingOperationStampType =
  | "approved"
  | "rejected"
  | "acknowledged";

export type MessagingGroupParticipantRole =
  | "shipper"
  | "carrier"
  | "agent"
  | "observer";

export const MESSAGING_GROUP_PARTICIPANT_ROLES: MessagingGroupParticipantRole[] =
  ["shipper", "carrier", "agent", "observer"];

export function groupParticipantRoleLabel(role: string): string {
  switch (role) {
    case "shipper":
      return "Yükleyici";
    case "carrier":
      return "Nakliyeci";
    case "agent":
      return "Acente";
    default:
      return "Gözlemci";
  }
}

export function operationStampLabel(stampType: MessagingOperationStampType): string {
  switch (stampType) {
    case "approved":
      return "Onaylandı";
    case "rejected":
      return "Reddedildi";
    default:
      return "Görüldü";
  }
}

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

export function formatThreadListPreview(raw: string, maxLength = 96): string {
  let text = raw
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/@\{[0-9a-f-]{36}\}/gi, "@ekip")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length > maxLength) {
    text = `${text.slice(0, maxLength - 1)}…`;
  }
  return text;
}

export function formatThreadListTime(
  iso: string | null | undefined,
  locale: string,
): string {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const now = new Date();
  const startOfDay = (value: Date): number =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const diffDays = Math.round(
    (startOfDay(now) - startOfDay(date)) / (24 * 60 * 60 * 1000),
  );
  if (diffDays === 0) {
    return date.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (diffDays === 1) {
    return "Dün";
  }
  if (diffDays < 7) {
    return date.toLocaleDateString(locale, { weekday: "short" });
  }
  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
  });
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
