import { LERTA_MAIL_EMBED_PARENT_ORIGINS } from "./embeddedParentSession";

/** Virgülle ayrılmış: NEXT_PUBLIC_LERTA_APP_ORIGINS=https://app.lerta.com.tr */
export function resolveEmbedParentOrigins(): readonly string[] {
  const raw = process.env.NEXT_PUBLIC_LERTA_APP_ORIGINS?.trim();
  if (!raw) {
    return LERTA_MAIL_EMBED_PARENT_ORIGINS;
  }
  const fromEnv = raw
    .split(/[,;]/)
    .map((value) => value.trim())
    .filter(Boolean);
  return fromEnv.length > 0 ? fromEnv : LERTA_MAIL_EMBED_PARENT_ORIGINS;
}

export function postTokenRequestToEmbedParents(
  message: { type: string },
): void {
  if (window.parent === window) {
    return;
  }
  for (const origin of resolveEmbedParentOrigins()) {
    try {
      window.parent.postMessage(message, origin);
    } catch {
      /* ignore */
    }
  }
}
