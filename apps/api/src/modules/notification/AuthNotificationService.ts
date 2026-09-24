import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { CompanyEntity } from "../../infrastructure/database/entities/CompanyEntity";
import { UserAccountEntity } from "../../infrastructure/database/entities/UserAccountEntity";
import { AuthRequestContext } from "./AuthRequestContext";
import { EmailOutboxService } from "./EmailOutboxService";
import { EmailRecipientKind, NotificationEventCode } from "./NotificationEventCode";
import { NotificationConfigurationService } from "./NotificationConfigurationService";
import { PlatformNotificationSettingsService } from "./PlatformNotificationSettingsService";

@Injectable()
export class AuthNotificationService {
  public constructor(
    @InjectRepository(UserAccountEntity)
    private readonly userAccountRepository: Repository<UserAccountEntity>,
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,
    private readonly emailOutboxService: EmailOutboxService,
    private readonly platformNotificationSettingsService: PlatformNotificationSettingsService,
    private readonly notificationConfigurationService: NotificationConfigurationService,
  ) {}

  public async afterRegistration(
    user: AuthenticatedUserContext,
    http: AuthRequestContext,
  ): Promise<void> {
    await this.recordLogin(user.userId, true);
    await this.emitRegistration(user, http);
    await this.emitLogin(user, http, true);
  }

  public async afterLogin(
    user: AuthenticatedUserContext,
    http: AuthRequestContext,
  ): Promise<void> {
    await this.recordLogin(user.userId, false);
    await this.emitLogin(user, http, false);
  }

  private async recordLogin(userId: string, isRegistration: boolean): Promise<void> {
    const account = await this.userAccountRepository.findOne({
      where: { id: userId },
    });
    if (!account) {
      return;
    }
    const now = new Date();
    if (isRegistration || account.loginCount === 0) {
      if (!account.firstLoginAt) {
        account.firstLoginAt = now;
      }
      account.loginCount = Math.max(1, account.loginCount + 1);
    } else {
      account.loginCount += 1;
    }
    account.lastLoginAt = now;
    await this.userAccountRepository.save(account);
  }

  private async emitRegistration(
    user: AuthenticatedUserContext,
    http: AuthRequestContext,
  ): Promise<void> {
    const company = await this.companyRepository.findOne({
      where: { id: user.companyId },
    });
    const settings = await this.platformNotificationSettingsService.getSetting(
      NotificationEventCode.UserRegistered,
    );
    const baseUrl = this.notificationConfigurationService.resolveWebBaseUrl();
    const payload: Record<string, string> = {
      displayName: user.emailAddress,
      emailAddress: user.emailAddress,
      companyLegalName: company?.legalName ?? "—",
      companyCountryCode: company?.countryCode ?? "—",
      participantType: company?.participantTypeCode ?? "—",
      planCode: "carrier_starter_tr_ua",
      companyId: user.companyId,
      userId: user.userId,
      ipAddress: http.ipAddress,
      userAgent: http.userAgent,
      organizasyonUrl: `${baseUrl}/hesap/organizasyon`,
      occurredAt: new Date().toISOString(),
    };
    const account = await this.userAccountRepository.findOne({
      where: { id: user.userId },
    });
    if (account?.displayName) {
      payload.displayName = account.displayName;
    }
    if (settings.adminEmailEnabled) {
      const recipients =
        settings.adminRecipientEmails.length > 0
          ? settings.adminRecipientEmails
          : this.notificationConfigurationService.resolveDefaultAdminRecipients();
      for (const email of recipients) {
        await this.emailOutboxService.enqueue({
          eventCode: NotificationEventCode.UserRegistered,
          recipientKind: EmailRecipientKind.Admin,
          recipientEmail: email,
          locale: "tr",
          payload,
          idempotencyKey: `USER_REGISTERED:admin:${user.userId}:${email}`,
          metadata: { userId: user.userId },
        });
      }
    }
    if (settings.userEmailEnabled) {
      const locale = account?.preferredLocale ?? "tr";
      await this.emailOutboxService.enqueue({
        eventCode: NotificationEventCode.UserRegistered,
        recipientKind: EmailRecipientKind.User,
        recipientEmail: user.emailAddress,
        locale,
        payload,
        idempotencyKey: `USER_REGISTERED:user:${user.userId}`,
        metadata: { userId: user.userId },
      });
    }
  }

  private async emitLogin(
    user: AuthenticatedUserContext,
    http: AuthRequestContext,
    isRegistration: boolean,
  ): Promise<void> {
    const settings = await this.platformNotificationSettingsService.getSetting(
      NotificationEventCode.UserLogin,
    );
    if (!settings.adminEmailEnabled) {
      return;
    }
    const company = await this.companyRepository.findOne({
      where: { id: user.companyId },
    });
    const account = await this.userAccountRepository.findOne({
      where: { id: user.userId },
    });
    const payload: Record<string, string> = {
      displayName: account?.displayName ?? user.emailAddress,
      emailAddress: user.emailAddress,
      companyLegalName: company?.legalName ?? "—",
      companyId: user.companyId,
      ipAddress: http.ipAddress,
      userAgent: http.userAgent,
      loginCount: String(account?.loginCount ?? 1),
      occurredAt: new Date().toISOString(),
      isRegistration: isRegistration ? "evet" : "hayır",
    };
    const recipients =
      settings.adminRecipientEmails.length > 0
        ? settings.adminRecipientEmails
        : this.notificationConfigurationService.resolveDefaultAdminRecipients();
    const loginIndex = account?.loginCount ?? 1;
    for (const email of recipients) {
      await this.emailOutboxService.enqueue({
        eventCode: NotificationEventCode.UserLogin,
        recipientKind: EmailRecipientKind.Admin,
        recipientEmail: email,
        locale: "tr",
        payload,
        idempotencyKey: `USER_LOGIN:admin:${user.userId}:${loginIndex}:${email}`,
        metadata: { userId: user.userId, loginCount: loginIndex },
      });
    }
  }
}
