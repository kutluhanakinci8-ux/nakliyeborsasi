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
};

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
    };
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
    };
  }
}
