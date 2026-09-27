export const LERTA_MAIL_EMBED_CHILD_ORIGIN =
  process.env.NEXT_PUBLIC_MAIL_WEB_URL?.replace(/\/$/, "") ??
  "https://posta.lerta.com.tr";

export type MailEmbedTokenMessage = {
  type: "lerta-mail-set-token";
  accessToken: string;
};

export type MailEmbedTokenRequestMessage = {
  type: "lerta-mail-request-token";
};

export function isMailEmbedTokenRequest(
  data: unknown,
): data is MailEmbedTokenRequestMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as MailEmbedTokenRequestMessage).type === "lerta-mail-request-token"
  );
}
