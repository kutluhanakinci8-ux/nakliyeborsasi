import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { authenticator } from "otplib";
import { Repository } from "typeorm";
import { UserAccountEntity } from "../../infrastructure/database/entities/UserAccountEntity";
import { PasswordHashingService } from "./PasswordHashingService";
import {
  decryptTotpSecret,
  encryptTotpSecret,
} from "./TotpSecretCipher";

authenticator.options = { window: 1 };

@Injectable()
export class UserTotpService {
  public constructor(
    private readonly configService: ConfigService,
    private readonly passwordHashingService: PasswordHashingService,
    @InjectRepository(UserAccountEntity)
    private readonly userAccountRepository: Repository<UserAccountEntity>,
  ) {}

  public async getStatus(userId: string): Promise<{
    enabled: boolean;
    enabledAt: string | null;
    pendingSetup: boolean;
  }> {
    const user = await this.findUser(userId);
    return {
      enabled: Boolean(user.totpEnabledAt && user.totpSecretCiphertext),
      enabledAt: user.totpEnabledAt?.toISOString() ?? null,
      pendingSetup: Boolean(user.totpPendingSecretCiphertext),
    };
  }

  public async isEnabled(userId: string): Promise<boolean> {
    const status = await this.getStatus(userId);
    return status.enabled;
  }

  public async beginSetup(userId: string, emailAddress: string) {
    const user = await this.findUser(userId);
    if (user.totpEnabledAt) {
      throw new BadRequestException("İki adımlı doğrulama zaten açık.");
    }
    const secret = authenticator.generateSecret();
    user.totpPendingSecretCiphertext = this.encrypt(secret);
    await this.userAccountRepository.save(user);
    const issuer =
      this.configService.get<string>("MAIL_TOTP_ISSUER")?.trim() ||
      "Lerta Mail";
    const otpauthUrl = authenticator.keyuri(emailAddress, issuer, secret);
    return { secret, otpauthUrl, issuer };
  }

  public async confirmSetup(userId: string, code: string): Promise<void> {
    const user = await this.findUser(userId);
    if (!user.totpPendingSecretCiphertext) {
      throw new BadRequestException("Kurulum başlatılmadı.");
    }
    const secret = this.decrypt(user.totpPendingSecretCiphertext);
    if (!this.verifyCode(secret, code)) {
      throw new ForbiddenException("Doğrulama kodu geçersiz.");
    }
    user.totpSecretCiphertext = user.totpPendingSecretCiphertext;
    user.totpPendingSecretCiphertext = null;
    user.totpEnabledAt = new Date();
    await this.userAccountRepository.save(user);
  }

  public async disable(
    userId: string,
    params: { password: string; code: string },
  ): Promise<void> {
    const user = await this.findUser(userId);
    if (!user.totpEnabledAt || !user.totpSecretCiphertext) {
      throw new BadRequestException("İki adımlı doğrulama kapalı.");
    }
    const passwordValid = await this.passwordHashingService.verifyPassword(
      params.password,
      user.passwordHash,
    );
    if (!passwordValid) {
      throw new ForbiddenException("Şifre hatalı.");
    }
    const secret = this.decrypt(user.totpSecretCiphertext);
    if (!this.verifyCode(secret, params.code)) {
      throw new ForbiddenException("Doğrulama kodu geçersiz.");
    }
    user.totpSecretCiphertext = null;
    user.totpPendingSecretCiphertext = null;
    user.totpEnabledAt = null;
    await this.userAccountRepository.save(user);
  }

  public async verifyForUser(userId: string, code: string): Promise<boolean> {
    const user = await this.findUser(userId);
    if (!user.totpSecretCiphertext) {
      return false;
    }
    const secret = this.decrypt(user.totpSecretCiphertext);
    return this.verifyCode(secret, code);
  }

  private verifyCode(secret: string, code: string): boolean {
    const normalized = code.replace(/\s/g, "");
    return authenticator.verify({ token: normalized, secret });
  }

  private encrypt(secret: string): string {
    return encryptTotpSecret(secret, this.resolveEncryptionKey());
  }

  private decrypt(blob: string): string {
    return decryptTotpSecret(blob, this.resolveEncryptionKey());
  }

  private resolveEncryptionKey(): string {
    const key =
      this.configService.get<string>("AUTH_TOTP_ENCRYPTION_KEY")?.trim() ||
      this.configService.get<string>("JWT_SECRET")?.trim();
    if (!key) {
      throw new Error("AUTH_TOTP_ENCRYPTION_KEY or JWT_SECRET is required");
    }
    return key;
  }

  private async findUser(userId: string): Promise<UserAccountEntity> {
    const user = await this.userAccountRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new BadRequestException("Kullanıcı bulunamadı.");
    }
    return user;
  }
}
