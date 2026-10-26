/** Kurumsal posta adresi yapılandırması (legal footer içinde gizli işaret). */
export type LertaPostalAddressPayload = {
  countryCode: string;
  houseNumber?: string;
  road?: string;
  city?: string;
  postcode?: string;
  state?: string;
  suburb?: string;
};

const MARKER_RE = /\n?\[lerta-postal:v1:([A-Za-z0-9_-]+)\]\s*$/;

function encodeBase64UrlUtf8(text: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(text, "utf8").toString("base64url");
  }
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64UrlUtf8(token: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(token, "base64url").toString("utf8");
  }
  const padded = token.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function stripLertaPostalMarker(footer: string): string {
  return footer.replace(MARKER_RE, "").trimEnd();
}

export function extractLertaPostalMarker(
  footer: string,
): LertaPostalAddressPayload | null {
  const match = footer.match(MARKER_RE);
  if (!match?.[1]) {
    return null;
  }
  try {
    const json = decodeBase64UrlUtf8(match[1]);
    const parsed = JSON.parse(json) as LertaPostalAddressPayload;
    if (!parsed.countryCode?.trim()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function appendLertaPostalMarker(
  footer: string,
  payload: LertaPostalAddressPayload,
): string {
  const base = stripLertaPostalMarker(footer).trimEnd();
  const token = encodeBase64UrlUtf8(JSON.stringify(payload));
  const marker = `[lerta-postal:v1:${token}]`;
  return base ? `${base}\n${marker}` : marker;
}
