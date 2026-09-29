export type PendingAttachment = {
  filename: string;
  contentType: string;
  contentBase64: string;
  previewUrl?: string;
};

export async function readFileAsAttachment(file: File): Promise<PendingAttachment> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  const contentType = file.type || "application/octet-stream";
  const previewUrl =
    contentType.startsWith("image/") ? URL.createObjectURL(file) : undefined;
  return {
    filename: file.name,
    contentType,
    contentBase64: btoa(binary),
    previewUrl,
  };
}

export function messageHasActiveMentionQuery(body: string): boolean {
  return /@([^\s]*)$/.test(body);
}

export type MessagingMode = "chat" | "email";

const MESSAGING_TAB_STORAGE_KEY = "lerta.messaging.lastTab";

export function rememberMessagingTab(mode: MessagingMode): void {
  try {
    window.localStorage.setItem(MESSAGING_TAB_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function readStoredMessagingTab(): MessagingMode | null {
  try {
    const raw = window.localStorage.getItem(MESSAGING_TAB_STORAGE_KEY);
    if (raw === "chat" || raw === "email") {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function participantTypeLabel(code: string | null | undefined): string {
  switch (code) {
    case "LOAD_SHIPPER":
      return "Yükveren";
    case "LOAD_CARRIER":
      return "Taşıyıcı";
    case "LOAD_SEEKER":
      return "Yük arayan";
    default:
      return "Firma";
  }
}

export function shortCompanyId(companyId: string): string {
  if (companyId.length <= 12) {
    return companyId;
  }
  return `${companyId.slice(0, 8)}…${companyId.slice(-4)}`;
}

export const COMPANY_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseCompanyUuidCandidate(raw: string): string | null {
  const trimmed = raw.trim();
  return COMPANY_UUID_RE.test(trimmed) ? trimmed : null;
}

export function parseMode(
  raw: string | null,
  preferChat: boolean,
): MessagingMode {
  if (raw === "chat" || raw === "sohbet") {
    return "chat";
  }
  if (raw === "email" || raw === "posta" || raw === "mail") {
    return "email";
  }
  if (preferChat) {
    return "chat";
  }
  return "email";
}
