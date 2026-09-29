import type { Request } from "express";

export type MessagingClientRequestContext = {
  clientIp: string | null;
  userAgent: string | null;
};

export function resolveMessagingClientRequestContext(
  request: Request,
): MessagingClientRequestContext {
  const forwarded = request.headers["x-forwarded-for"];
  let clientIp: string | null = request.ip ?? null;
  if (typeof forwarded === "string" && forwarded.trim().length > 0) {
    clientIp = forwarded.split(",")[0]?.trim() ?? clientIp;
  }
  const userAgentRaw = request.headers["user-agent"];
  const userAgent =
    typeof userAgentRaw === "string" && userAgentRaw.trim().length > 0
      ? userAgentRaw.trim().slice(0, 512)
      : null;
  return { clientIp, userAgent };
}
