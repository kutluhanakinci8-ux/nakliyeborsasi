import {
  parseSocialHubConnectionMetadata,
  serializeSocialHubConnectionMetadata,
} from "./SocialHubConnectionMetadata";
import { decryptTotpSecret, encryptTotpSecret } from "../../auth/TotpSecretCipher";

export function readRoadmapRefreshToken(
  grantedScopes: string | null | undefined,
  encKey: string,
): string | null {
  const meta = parseSocialHubConnectionMetadata(grantedScopes);
  const cipher = meta.roadmapRefreshTokenCipher;
  if (!cipher) {
    return null;
  }
  try {
    return decryptTotpSecret(cipher, encKey);
  } catch {
    return null;
  }
}

export function mergeRoadmapRefreshToken(
  grantedScopes: string | null | undefined,
  refreshToken: string,
  encKey: string,
): string {
  const meta = parseSocialHubConnectionMetadata(grantedScopes);
  meta.roadmapRefreshTokenCipher = encryptTotpSecret(refreshToken, encKey);
  return serializeSocialHubConnectionMetadata(meta);
}

export function hasRoadmapRefreshToken(
  grantedScopes: string | null | undefined,
): boolean {
  return Boolean(
    parseSocialHubConnectionMetadata(grantedScopes).roadmapRefreshTokenCipher,
  );
}
