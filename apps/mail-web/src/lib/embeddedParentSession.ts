/** app.lerta.com.tr iframe içinde posta — üçüncü taraf çerez/localStorage kısıtına karşı. */
export const LERTA_MAIL_EMBED_PARENT_ORIGINS = [
  "https://app.lerta.com.tr",
  "http://localhost:3011",
  "http://127.0.0.1:3011",
] as const;

export type MailEmbedTokenMessage = {
  type: "lerta-mail-set-token";
  accessToken: string;
};

export type MailEmbedTokenRequestMessage = {
  type: "lerta-mail-request-token";
};

export function isAllowedEmbedParent(origin: string): boolean {
  return (LERTA_MAIL_EMBED_PARENT_ORIGINS as readonly string[]).includes(origin);
}

export function parseEmbedFromSearch(search: string): boolean {
  try {
    const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
    return params.get("embed") === "1" || params.get("embedded") === "1";
  } catch {
    return false;
  }
}
