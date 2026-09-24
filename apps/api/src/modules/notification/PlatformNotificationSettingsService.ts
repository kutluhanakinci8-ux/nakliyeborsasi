import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PlatformNotificationSettingEntity } from "../../infrastructure/database/entities/PlatformNotificationSettingEntity";
import { NotificationConfigurationService } from "./NotificationConfigurationService";
import { NotificationEventCode } from "./NotificationEventCode";

const DEFAULT_EVENTS: NotificationEventCode[] = [
  NotificationEventCode.UserRegistered,
  NotificationEventCode.UserLogin,
  NotificationEventCode.UserFirstLogin,
  NotificationEventCode.EmailVerification,
  NotificationEventCode.PasswordReset,
];

@Injectable()
export class PlatformNotificationSettingsService implements OnModuleInit {
  public constructor(
    @InjectRepository(PlatformNotificationSettingEntity)
    private readonly settingsRepository: Repository<PlatformNotificationSettingEntity>,
    private readonly notificationConfigurationService: NotificationConfigurationService,
  ) {}

  public async onModuleInit(): Promise<void> {
    await this.ensureDefaults();
  }

  public async ensureDefaults(): Promise<void> {
    const defaults = this.notificationConfigurationService.resolveDefaultAdminRecipients();
    for (const eventCode of DEFAULT_EVENTS) {
      const existing = await this.settingsRepository.findOne({
        where: { eventCode },
      });
      if (existing) {
        await this.mergeDefaultAdminRecipients(existing);
        continue;
      }
      const adminEnabled =
        eventCode !== NotificationEventCode.UserFirstLogin;
      const userEnabled =
        eventCode === NotificationEventCode.UserRegistered ||
        eventCode === NotificationEventCode.EmailVerification ||
        eventCode === NotificationEventCode.PasswordReset;
      await this.settingsRepository.save(
        this.settingsRepository.create({
          eventCode,
          adminEmailEnabled: adminEnabled,
          userEmailEnabled: userEnabled,
          adminRecipientEmails: [...defaults],
        }),
      );
    }
  }

  public async listSettings(): Promise<PlatformNotificationSettingEntity[]> {
    await this.ensureDefaults();
    return this.settingsRepository.find({ order: { eventCode: "ASC" } });
  }

  public async updateSetting(
    eventCode: string,
    patch: Partial<
      Pick<
        PlatformNotificationSettingEntity,
        "adminEmailEnabled" | "userEmailEnabled" | "adminRecipientEmails"
      >
    >,
  ): Promise<PlatformNotificationSettingEntity> {
    await this.ensureDefaults();
    const row = await this.settingsRepository.findOne({
      where: { eventCode },
    });
    if (!row) {
      throw new Error(`Unknown event code: ${eventCode}`);
    }
    Object.assign(row, patch);
    return this.settingsRepository.save(row);
  }

  private async mergeDefaultAdminRecipients(
    row: PlatformNotificationSettingEntity,
  ): Promise<void> {
    const defaults = this.notificationConfigurationService.resolveDefaultAdminRecipients();
    if (defaults.length === 0) {
      return;
    }
    const current = row.adminRecipientEmails ?? [];
    const staleOnly =
      current.length === 0 ||
      current.every((email) =>
        email.endsWith("@nakliyeborsasi.local"),
      );
    if (!staleOnly) {
      return;
    }
    row.adminRecipientEmails = [...defaults];
    await this.settingsRepository.save(row);
  }

  public async getSetting(
    eventCode: NotificationEventCode,
  ): Promise<PlatformNotificationSettingEntity> {
    await this.ensureDefaults();
    const row = await this.settingsRepository.findOne({
      where: { eventCode },
    });
    if (!row) {
      throw new Error(`Missing settings for ${eventCode}`);
    }
    return row;
  }
}
