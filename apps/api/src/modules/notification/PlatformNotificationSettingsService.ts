import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PlatformNotificationSettingEntity } from "../../infrastructure/database/entities/PlatformNotificationSettingEntity";
import { NotificationConfigurationService } from "./NotificationConfigurationService";
import { NotificationEventCode } from "./NotificationEventCode";
import { NOTIFICATION_EVENT_CATALOG } from "./NotificationEventCatalog";

const DEFAULT_EVENTS: NotificationEventCode[] = NOTIFICATION_EVENT_CATALOG.map(
  (row) => row.code,
);

@Injectable()
export class PlatformNotificationSettingsService implements OnModuleInit {
  public constructor(
    @InjectRepository(PlatformNotificationSettingEntity)
    private readonly settingsRepository: Repository<PlatformNotificationSettingEntity>,
    private readonly notificationConfigurationService: NotificationConfigurationService,
    private readonly configService: ConfigService,
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
        await this.applyPhaseAProductionDefaults(existing, eventCode);
        continue;
      }
      const definition = NOTIFICATION_EVENT_CATALOG.find(
        (row) => row.code === eventCode,
      );
      await this.settingsRepository.save(
        this.settingsRepository.create({
          eventCode,
          adminEmailEnabled:
            definition?.defaultAdminEnabled ??
            eventCode !== NotificationEventCode.UserFirstLogin,
          userEmailEnabled: definition?.defaultUserEnabled ?? false,
          adminRecipientEmails: [...defaults],
          metadata: null,
        }),
      );
    }
  }

  /** Faz A: gürültülü admin bildirimlerini bir kez kapat (USER_LOGIN). */
  private async applyPhaseAProductionDefaults(
    row: PlatformNotificationSettingEntity,
    eventCode: NotificationEventCode,
  ): Promise<void> {
    if (eventCode !== NotificationEventCode.UserLogin) {
      return;
    }
    const meta = row.metadata ?? {};
    if (meta.phaseAUserLoginDefaultApplied === true) {
      return;
    }
    const forceOn =
      this.configService.get<string>("PLATFORM_ADMIN_NOTIFY_USER_LOGIN") ===
      "true";
    if (!forceOn) {
      row.adminEmailEnabled = false;
    }
    row.metadata = {
      ...meta,
      phaseAUserLoginDefaultApplied: true,
      phaseAUserLoginAppliedAt: new Date().toISOString(),
    };
    await this.settingsRepository.save(row);
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
