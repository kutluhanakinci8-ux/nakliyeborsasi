import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserNotificationPreferenceEntity } from "../../infrastructure/database/entities/UserNotificationPreferenceEntity";
import {
  NotificationEventCode,
} from "./NotificationEventCode";
import {
  resolveEventDefinition,
  type UserPreferenceKey,
} from "./NotificationEventCatalog";

export type UserNotificationPreferencesDto = {
  notifyNewOffers: boolean;
  notifyMessages: boolean;
  notifyAuctions: boolean;
  notifyWeeklyDigest: boolean;
  notifyPushNewOffers: boolean;
  notifyPushMessages: boolean;
  notifyPushAuctions: boolean;
  aiMailAssistConsent: boolean;
  aiMailAssentAt: string | null;
};

export type UserPushPreferenceKey =
  | "notifyPushNewOffers"
  | "notifyPushMessages"
  | "notifyPushAuctions";

@Injectable()
export class UserNotificationPreferenceService {
  public constructor(
    @InjectRepository(UserNotificationPreferenceEntity)
    private readonly repository: Repository<UserNotificationPreferenceEntity>,
  ) {}

  public async getForUser(
    userId: string,
  ): Promise<UserNotificationPreferencesDto> {
    const row = await this.repository.findOne({ where: { userId } });
    if (!row) {
      return this.defaults();
    }
    return {
      notifyNewOffers: row.notifyNewOffers,
      notifyMessages: row.notifyMessages,
      notifyAuctions: row.notifyAuctions,
      notifyWeeklyDigest: row.notifyWeeklyDigest,
      aiMailAssistConsent: row.aiMailAssistConsent ?? false,
      aiMailAssentAt: row.aiMailAssentAt?.toISOString() ?? null,
      notifyPushNewOffers: row.notifyPushNewOffers ?? true,
      notifyPushMessages: row.notifyPushMessages ?? true,
      notifyPushAuctions: row.notifyPushAuctions ?? true,
    };
  }

  public resolvePushPreference(
    prefs: UserNotificationPreferencesDto,
    emailKey: UserPreferenceKey,
  ): boolean | null {
    if (emailKey === "notifyNewOffers") {
      return prefs.notifyPushNewOffers;
    }
    if (emailKey === "notifyMessages") {
      return prefs.notifyPushMessages;
    }
    if (emailKey === "notifyAuctions") {
      return prefs.notifyPushAuctions;
    }
    return null;
  }

  public async hasAiMailAssistConsent(userId: string): Promise<boolean> {
    const prefs = await this.getForUser(userId);
    return prefs.aiMailAssistConsent;
  }

  public async setAiMailAssistConsent(
    userId: string,
    consent: boolean,
  ): Promise<UserNotificationPreferencesDto> {
    let row = await this.repository.findOne({ where: { userId } });
    if (!row) {
      row = this.repository.create({ userId, ...this.defaults() });
    }
    row.aiMailAssistConsent = consent;
    row.aiMailAssentAt = consent ? new Date() : null;
    await this.repository.save(row);
    return this.getForUser(userId);
  }

  public async updateForUser(
    userId: string,
    patch: Partial<UserNotificationPreferencesDto>,
  ): Promise<UserNotificationPreferencesDto> {
    let row = await this.repository.findOne({ where: { userId } });
    if (!row) {
      row = this.repository.create({ userId, ...this.defaults() });
    }
    Object.assign(row, patch);
    await this.repository.save(row);
    return this.getForUser(userId);
  }

  public async isUserEmailAllowed(
    userId: string,
    eventCode: NotificationEventCode,
  ): Promise<boolean> {
    const definition = resolveEventDefinition(eventCode);
    if (!definition?.userPreferenceKey) {
      return true;
    }
    const prefs = await this.getForUser(userId);
    return prefs[definition.userPreferenceKey];
  }

  private defaults(): UserNotificationPreferencesDto {
    return {
      notifyNewOffers: true,
      notifyMessages: true,
      notifyAuctions: true,
      notifyWeeklyDigest: false,
      notifyPushNewOffers: true,
      notifyPushMessages: true,
      notifyPushAuctions: true,
      aiMailAssistConsent: false,
      aiMailAssentAt: null,
    };
  }
}
