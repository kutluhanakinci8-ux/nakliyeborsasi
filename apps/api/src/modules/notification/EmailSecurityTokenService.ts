import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { createHash, randomBytes } from "crypto";
import { Repository } from "typeorm";
import {
  AuthenticationException,
  ResourceNotFoundException,
  ValidationException,
} from "@nakliyeborsasi/core";
import { EmailVerificationTokenEntity } from "../../infrastructure/database/entities/EmailVerificationTokenEntity";
import { PasswordResetTokenEntity } from "../../infrastructure/database/entities/PasswordResetTokenEntity";
import { UserAccountEntity } from "../../infrastructure/database/entities/UserAccountEntity";
import { EmailOutboxService } from "./EmailOutboxService";
import { EmailRecipientKind, NotificationEventCode } from "./NotificationEventCode";
import { NotificationConfigurationService } from "./NotificationConfigurationService";
import { PlatformNotificationSettingsService } from "./PlatformNotificationSettingsService";
import { PasswordHashingService } from "../auth/PasswordHashingService";

@Injectable()
export class EmailSecurityTokenService {
  public constructor(
    @InjectRepository(UserAccountEntity)
    private readonly userAccountRepository: Repository<UserAccountEntity>,
    @InjectRepository(EmailVerificationTokenEntity)
    private readonly emailVerificationRepository: Repository<EmailVerificationTokenEntity>,
    @InjectRepository(PasswordResetTokenEntity)
    private readonly passwordResetRepository: Repository<PasswordResetTokenEntity>,
    private readonly emailOutboxService: EmailOutboxService,
    private readonly platformNotificationSettingsService: PlatformNotificationSettingsService,
    private readonly notificationConfigurationService: NotificationConfigurationService,
    private readonly passwordHashingService: PasswordHashingService,
    private readonly configService: ConfigService,
  ) {}

  public async requestEmailVerification(userId: string): Promise<void> {
    const user = await this.userAccountRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new ResourceNotFoundException("UserAccount", userId);
    }
    if (user.emailVerifiedAt) {
      return;
    }
    const settings = await this.platformNotificationSettingsService.getSetting(
      NotificationEventCode.EmailVerification,
    );
    if (!settings.userEmailEnabled) {
      return;
    }
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await this.emailVerificationRepository.save(
      this.emailVerificationRepository.create({
        userId,
        tokenHash,
        expiresAt,
        consumedAt: null,
      }),
    );
    const baseUrl = this.notificationConfigurationService.resolveWebBaseUrl();
    const verifyUrl = `${baseUrl}/login?verifyEmail=${rawToken}`;
    await this.emailOutboxService.enqueue({
      eventCode: NotificationEventCode.EmailVerification,
      recipientKind: EmailRecipientKind.User,
      recipientEmail: user.emailAddress,
      locale: user.preferredLocale ?? "tr",
      payload: {
        displayName: user.displayName,
        verifyUrl,
      },
      idempotencyKey: `EMAIL_VERIFICATION:${userId}:${tokenHash.slice(0, 16)}`,
    });
  }

  public async verifyEmail(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    const row = await this.emailVerificationRepository.findOne({
      where: { tokenHash },
    });
    if (!row || row.consumedAt || row.expiresAt < new Date()) {
      throw new ValidationException("Invalid or expired verification token");
    }
    row.consumedAt = new Date();
    await this.emailVerificationRepository.save(row);
    const user = await this.userAccountRepository.findOne({
      where: { id: row.userId },
    });
    if (!user) {
      throw new ResourceNotFoundException("UserAccount", row.userId);
    }
    user.emailVerifiedAt = new Date();
    await this.userAccountRepository.save(user);
  }

  public async requestPasswordReset(emailAddress: string): Promise<void> {
    const user = await this.userAccountRepository.findOne({
      where: { emailAddress: emailAddress.toLowerCase() },
    });
    if (!user) {
      return;
    }
    const settings = await this.platformNotificationSettingsService.getSetting(
      NotificationEventCode.PasswordReset,
    );
    if (!settings.userEmailEnabled) {
      return;
    }
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(rawToken);
    await this.passwordResetRepository.save(
      this.passwordResetRepository.create({
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        consumedAt: null,
      }),
    );
    const mailConsole =
      this.configService.get<string>("MAIL_CONSOLE_PUBLIC_URL")?.trim() ||
      null;
    const baseUrl = this.notificationConfigurationService.resolveWebBaseUrl();
    const resetUrl = mailConsole
      ? `${mailConsole.replace(/\/$/, "")}/reset-password?token=${rawToken}`
      : `${baseUrl}/login?resetPassword=${rawToken}`;
    await this.emailOutboxService.enqueue({
      eventCode: NotificationEventCode.PasswordReset,
      recipientKind: EmailRecipientKind.User,
      recipientEmail: user.emailAddress,
      locale: user.preferredLocale ?? "tr",
      payload: {
        displayName: user.displayName,
        resetUrl,
      },
      idempotencyKey: `PASSWORD_RESET:${user.id}:${tokenHash.slice(0, 16)}`,
    });
  }

  public async resetPassword(
    rawToken: string,
    newPassword: string,
  ): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    const row = await this.passwordResetRepository.findOne({
      where: { tokenHash },
    });
    if (!row || row.consumedAt || row.expiresAt < new Date()) {
      throw new ValidationException("Invalid or expired reset token");
    }
    const user = await this.userAccountRepository.findOne({
      where: { id: row.userId },
    });
    if (!user) {
      throw new AuthenticationException("User not found");
    }
    user.passwordHash = await this.passwordHashingService.hashPassword(
      newPassword,
    );
    await this.userAccountRepository.save(user);
    row.consumedAt = new Date();
    await this.passwordResetRepository.save(row);
  }

  private hashToken(raw: string): string {
    return createHash("sha256").update(raw).digest("hex");
  }
}
