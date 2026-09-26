import { ConfigService } from "@nestjs/config";
import {
  decryptTotpSecret,
  encryptTotpSecret,
} from "../auth/TotpSecretCipher";

export function resolveMailCalendarCredentialKey(
  configService: ConfigService,
): string {
  const explicit = configService
    .get<string>("MAIL_CALENDAR_CREDENTIAL_KEY")
    ?.trim();
  if (explicit) {
    return explicit;
  }
  const totp = configService.get<string>("AUTH_TOTP_ENCRYPTION_KEY")?.trim();
  if (totp) {
    return totp;
  }
  const jwt = configService.get<string>("JWT_SECRET")?.trim();
  if (jwt) {
    return jwt;
  }
  throw new Error(
    "MAIL_CALENDAR_CREDENTIAL_KEY, AUTH_TOTP_ENCRYPTION_KEY veya JWT_SECRET gerekli",
  );
}

export function encryptCalendarCredential(
  plain: string,
  configService: ConfigService,
): string {
  return encryptTotpSecret(plain, resolveMailCalendarCredentialKey(configService));
}

export function decryptCalendarCredential(
  blob: string,
  configService: ConfigService,
): string {
  return decryptTotpSecret(blob, resolveMailCalendarCredentialKey(configService));
}
