export type AuthRequestContext = {
  ipAddress: string;
  userAgent: string;
};

export function authRequestContextFromHttp(
  ip: string | undefined,
  forwardedFor: string | undefined,
  userAgent: string | undefined,
): AuthRequestContext {
  const rawIp =
    forwardedFor?.split(",")[0]?.trim() ||
    ip?.trim() ||
    "bilinmiyor";
  return {
    ipAddress: rawIp.slice(0, 64),
    userAgent: (userAgent ?? "bilinmiyor").slice(0, 256),
  };
}
