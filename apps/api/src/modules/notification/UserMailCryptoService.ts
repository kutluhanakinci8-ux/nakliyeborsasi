import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { Repository } from "typeorm";
import { UserMailCryptoSettingsEntity } from "../../infrastructure/database/entities/UserMailCryptoSettingsEntity";

export type UserMailCryptoSettingsDto = {
  pgpPublicKeyArmored: string | null;
  pgpKeyFingerprint: string | null;
  hasSmimeCertificate: boolean;
  hasSmimePrivateKey: boolean;
  outboundSignSmime: boolean;
  composePreferPgp: boolean;
};

export type UpdateUserMailCryptoInput = {
  pgpPublicKeyArmored?: string | null;
  pgpKeyFingerprint?: string | null;
  smimeCertificatePem?: string | null;
  smimePrivateKeyPem?: string | null;
  clearSmimePrivateKey?: boolean;
  outboundSignSmime?: boolean;
  composePreferPgp?: boolean;
};

@Injectable()
export class UserMailCryptoService {
  public constructor(
    @InjectRepository(UserMailCryptoSettingsEntity)
    private readonly repository: Repository<UserMailCryptoSettingsEntity>,
    private readonly configService: ConfigService,
  ) {}

  public async getForUser(userId: string): Promise<UserMailCryptoSettingsDto> {
    const row = await this.repository.findOne({ where: { userId } });
    return this.toDto(row);
  }

  public async updateForUser(
    userId: string,
    input: UpdateUserMailCryptoInput,
  ): Promise<UserMailCryptoSettingsDto> {
    let row = await this.repository.findOne({ where: { userId } });
    if (!row) {
      row = this.repository.create({
        userId,
        outboundSignSmime: false,
        composePreferPgp: false,
      });
    }
    if (input.pgpPublicKeyArmored !== undefined) {
      const key = input.pgpPublicKeyArmored?.trim() || null;
      if (key && !key.includes("BEGIN PGP PUBLIC KEY BLOCK")) {
        throw new BadRequestException("Geçerli PGP public key (armored) gerekli.");
      }
      row.pgpPublicKeyArmored = key;
    }
    if (input.pgpKeyFingerprint !== undefined) {
      row.pgpKeyFingerprint = input.pgpKeyFingerprint?.trim().slice(0, 64) || null;
    }
    if (input.smimeCertificatePem !== undefined) {
      const pem = input.smimeCertificatePem?.trim() || null;
      if (pem && !pem.includes("BEGIN CERTIFICATE")) {
        throw new BadRequestException("Geçerli S/MIME sertifika PEM gerekli.");
      }
      row.smimeCertificatePem = pem;
    }
    if (input.clearSmimePrivateKey) {
      row.smimePrivateKeyEnc = null;
      row.outboundSignSmime = false;
    } else if (input.smimePrivateKeyPem !== undefined) {
      const pem = input.smimePrivateKeyPem?.trim() || null;
      if (pem && !pem.includes("BEGIN") && !pem.includes("PRIVATE KEY")) {
        throw new BadRequestException("Geçerli özel anahtar PEM gerekli.");
      }
      row.smimePrivateKeyEnc = pem
        ? this.encryptPrivateKey(userId, pem)
        : null;
    }
    if (input.outboundSignSmime !== undefined) {
      row.outboundSignSmime = Boolean(input.outboundSignSmime);
    }
    if (input.composePreferPgp !== undefined) {
      row.composePreferPgp = Boolean(input.composePreferPgp);
    }
    if (row.outboundSignSmime && (!row.smimeCertificatePem || !row.smimePrivateKeyEnc)) {
      throw new BadRequestException(
        "S/MIME imza için sertifika ve özel anahtar gerekli.",
      );
    }
    await this.repository.save(row);
    return this.toDto(row);
  }

  public async resolveSmimeSigningMaterial(
    userId: string,
  ): Promise<{ certificatePem: string; privateKeyPem: string } | null> {
    const row = await this.repository.findOne({ where: { userId } });
    if (!row?.outboundSignSmime || !row.smimeCertificatePem || !row.smimePrivateKeyEnc) {
      return null;
    }
    return {
      certificatePem: row.smimeCertificatePem,
      privateKeyPem: this.decryptPrivateKey(userId, row.smimePrivateKeyEnc),
    };
  }

  private toDto(row: UserMailCryptoSettingsEntity | null): UserMailCryptoSettingsDto {
    return {
      pgpPublicKeyArmored: row?.pgpPublicKeyArmored ?? null,
      pgpKeyFingerprint: row?.pgpKeyFingerprint ?? null,
      hasSmimeCertificate: Boolean(row?.smimeCertificatePem?.trim()),
      hasSmimePrivateKey: Boolean(row?.smimePrivateKeyEnc),
      outboundSignSmime: row?.outboundSignSmime ?? false,
      composePreferPgp: row?.composePreferPgp ?? false,
    };
  }

  private encryptionKey(userId: string): Buffer {
    const secret =
      this.configService.get<string>("JWT_SECRET")?.trim() || "dev-insecure";
    return createHash("sha256")
      .update(`${secret}:mail-crypto:${userId}`)
      .digest();
  }

  private encryptPrivateKey(userId: string, pem: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.encryptionKey(userId), iv);
    const enc = Buffer.concat([cipher.update(pem, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
  }

  private decryptPrivateKey(userId: string, payload: string): string {
    const [ivB64, tagB64, dataB64] = payload.split(":");
    if (!ivB64 || !tagB64 || !dataB64) {
      throw new BadRequestException("Şifreli anahtar bozuk.");
    }
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.encryptionKey(userId),
      Buffer.from(ivB64, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]).toString("utf8");
  }
}
