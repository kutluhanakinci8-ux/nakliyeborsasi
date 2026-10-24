import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
} from "@simplewebauthn/types";
import { Repository } from "typeorm";
import { UserWebAuthnCredentialEntity } from "../../infrastructure/database/entities/UserWebAuthnCredentialEntity";
import { UserAccountEntity } from "../../infrastructure/database/entities/UserAccountEntity";

type ChallengeEntry = {
  challenge: string;
  expiresAt: number;
};

const WEBAUTHN_TRANSPORTS = new Set<string>([
  "usb",
  "nfc",
  "ble",
  "internal",
  "hybrid",
  "cable",
  "smart-card",
]);

function normalizeWebAuthnTransports(
  transports: string[] | null | undefined,
): AuthenticatorTransportFuture[] | undefined {
  if (!transports?.length) {
    return undefined;
  }
  const filtered = transports.filter((t) =>
    WEBAUTHN_TRANSPORTS.has(t),
  ) as AuthenticatorTransportFuture[];
  return filtered.length > 0 ? filtered : undefined;
}

@Injectable()
export class UserWebAuthnService {
  private readonly challenges = new Map<string, ChallengeEntry>();

  public constructor(
    @InjectRepository(UserWebAuthnCredentialEntity)
    private readonly credentialRepository: Repository<UserWebAuthnCredentialEntity>,
    @InjectRepository(UserAccountEntity)
    private readonly userRepository: Repository<UserAccountEntity>,
    private readonly configService: ConfigService,
  ) {}

  public async listCredentials(userId: string) {
    const rows = await this.credentialRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
    });
    return rows.map((row) => ({
      id: row.id,
      deviceName: row.deviceName,
      createdAt: row.createdAt.toISOString(),
      lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    }));
  }

  public async deleteCredential(userId: string, credentialRowId: string) {
    const row = await this.credentialRepository.findOne({
      where: { id: credentialRowId, userId },
    });
    if (!row) {
      throw new NotFoundException("Passkey bulunamadı.");
    }
    await this.credentialRepository.remove(row);
  }

  public async createRegistrationOptions(
    userId: string,
    origin: string,
    deviceName?: string,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("Kullanıcı bulunamadı.");
    }
    const existing = await this.credentialRepository.find({
      where: { userId },
    });
    const { rpID, rpName } = this.resolveRp(origin);
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: user.emailAddress,
      userDisplayName: user.displayName || user.emailAddress,
      userID: new TextEncoder().encode(userId),
      attestationType: "none",
      excludeCredentials: existing.map((row) => ({
        id: row.credentialId,
        transports: normalizeWebAuthnTransports(row.transports),
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "required",
        authenticatorAttachment: "platform",
      },
    });
    this.storeChallenge(userId, options.challenge);
    return { options, deviceName: deviceName?.trim() || null };
  }

  public async verifyRegistration(
    userId: string,
    origin: string,
    response: RegistrationResponseJSON,
    deviceName?: string | null,
  ) {
    const challenge = this.consumeChallenge(userId);
    const { rpID } = this.resolveRp(origin);
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: this.expectedOrigins(origin),
      expectedRPID: rpID,
      requireUserVerification: true,
    });
    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestException("Passkey doğrulanamadı.");
    }
    const { credential, credentialDeviceType } = verification.registrationInfo;
    const row = this.credentialRepository.create({
      userId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: String(credential.counter),
      deviceName:
        deviceName?.trim() ||
        (credentialDeviceType === "singleDevice"
          ? "Bu cihaz (Face ID / Touch ID)"
          : "Passkey"),
      transports: credential.transports ?? null,
    });
    await this.credentialRepository.save(row);
    return { ok: true, credentialId: row.id };
  }

  public async createAuthenticationOptions(userId: string, origin: string) {
    const credentials = await this.credentialRepository.find({
      where: { userId },
    });
    if (credentials.length === 0) {
      throw new BadRequestException("Kayıtlı passkey yok.");
    }
    const { rpID } = this.resolveRp(origin);
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "required",
      allowCredentials: credentials.map((row) => ({
        id: row.credentialId,
        transports: normalizeWebAuthnTransports(row.transports),
      })),
    });
    this.storeChallenge(userId, options.challenge);
    return { options };
  }

  public async verifyAuthentication(
    userId: string,
    origin: string,
    response: AuthenticationResponseJSON,
  ) {
    const challenge = this.consumeChallenge(userId);
    const row = await this.credentialRepository.findOne({
      where: { userId, credentialId: response.id },
    });
    if (!row) {
      throw new BadRequestException("Passkey tanınmadı.");
    }
    const { rpID } = this.resolveRp(origin);
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: this.expectedOrigins(origin),
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: row.credentialId,
        publicKey: Buffer.from(row.publicKey, "base64url"),
        counter: Number(row.counter),
        transports: normalizeWebAuthnTransports(row.transports),
      },
    });
    if (!verification.verified) {
      throw new BadRequestException("Biyometrik doğrulama başarısız.");
    }
    row.counter = String(verification.authenticationInfo.newCounter);
    row.lastUsedAt = new Date();
    await this.credentialRepository.save(row);
    return { ok: true };
  }

  public async hasCredentials(userId: string): Promise<boolean> {
    const count = await this.credentialRepository.count({ where: { userId } });
    return count > 0;
  }

  private storeChallenge(userId: string, challenge: string) {
    this.challenges.set(userId, {
      challenge,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
  }

  private consumeChallenge(userId: string): string {
    const entry = this.challenges.get(userId);
    this.challenges.delete(userId);
    if (!entry || entry.expiresAt < Date.now()) {
      throw new BadRequestException("WebAuthn oturumu süresi doldu.");
    }
    return entry.challenge;
  }

  private resolveRp(origin: string): { rpID: string; rpName: string } {
    const configured = this.configService.get<string>("WEBAUTHN_RP_ID")?.trim();
    const rpName =
      this.configService.get<string>("WEBAUTHN_RP_NAME")?.trim() ||
      "Lerta Posta";
    if (configured) {
      return { rpID: configured, rpName };
    }
    try {
      const host = new URL(origin).hostname;
      return { rpID: host, rpName };
    } catch {
      return { rpID: "localhost", rpName };
    }
  }

  private expectedOrigins(requestOrigin: string): string[] {
    const list =
      this.configService.get<string>("WEBAUTHN_ORIGINS")?.split(",") ?? [];
    const trimmed = list.map((v) => v.trim()).filter(Boolean);
    if (trimmed.length > 0) {
      return trimmed;
    }
    return [requestOrigin];
  }
}
