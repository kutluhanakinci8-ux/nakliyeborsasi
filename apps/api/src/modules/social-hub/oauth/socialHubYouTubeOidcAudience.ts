/** Beta: JWT payload aud/exp check without signature verification. */
export function verifyYouTubePubSubOidcAudience(params: {
  authorizationHeader: string | undefined;
  expectedAudience: string;
  expectedIssuer?: string;
}): boolean {
  const expected = params.expectedAudience.trim();
  if (!expected) {
    return true;
  }
  const header = params.authorizationHeader?.trim();
  if (!header) {
    return false;
  }
  const token = header.replace(/^Bearer\s+/i, "").trim();
  const parts = token.split(".");
  if (parts.length < 2) {
    return false;
  }
  try {
    const payloadJson = Buffer.from(parts[1], "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson) as {
      aud?: string | string[];
      exp?: number;
      iss?: string;
    };
    const aud = payload.aud;
    const audOk = Array.isArray(aud)
      ? aud.includes(expected)
      : aud === expected;
    if (!audOk) {
      return false;
    }
    const issuer = params.expectedIssuer?.trim();
    if (issuer && payload.iss !== issuer) {
      return false;
    }
    if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
