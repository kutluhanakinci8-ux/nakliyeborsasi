import { decryptTotpSecret, encryptTotpSecret } from "../../auth/TotpSecretCipher";
import {
  parseSocialHubConnectionMetadata,
  serializeSocialHubConnectionMetadata,
  type SocialHubConnectionMetadata,
} from "./SocialHubConnectionMetadata";

export function readLinkedInRefreshToken(
  grantedScopes: string | null | undefined,
  encryptionKey: string,
): string | null {
  const metadata = parseSocialHubConnectionMetadata(grantedScopes);
  const cipher = metadata.linkedInRefreshTokenCipher;
  if (!cipher) {
    return null;
  }
  try {
    return decryptTotpSecret(cipher, encryptionKey);
  } catch {
    return null;
  }
}

export function mergeLinkedInRefreshToken(
  grantedScopes: string | null | undefined,
  refreshToken: string,
  encryptionKey: string,
): string {
  const metadata: SocialHubConnectionMetadata = {
    ...parseSocialHubConnectionMetadata(grantedScopes),
    linkedInRefreshTokenCipher: encryptTotpSecret(refreshToken, encryptionKey),
  };
  return serializeSocialHubConnectionMetadata(metadata);
}

export function hasLinkedInRefreshToken(
  grantedScopes: string | null | undefined,
): boolean {
  return Boolean(
    parseSocialHubConnectionMetadata(grantedScopes).linkedInRefreshTokenCipher,
  );
}
