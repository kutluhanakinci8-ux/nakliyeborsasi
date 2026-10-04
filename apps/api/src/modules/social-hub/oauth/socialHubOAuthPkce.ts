import { createHash, randomBytes } from "crypto";

/** RFC 7636 PKCE (required for X / Twitter OAuth 2.0). */
export function generatePkceVerifier(): string {
  return randomBytes(32).toString("base64url");
}

export function pkceChallengeS256(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}
