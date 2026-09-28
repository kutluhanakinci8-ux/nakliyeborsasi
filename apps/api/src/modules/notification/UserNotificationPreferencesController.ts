import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { AuthenticatedUserParam } from "../auth/AuthenticatedUserParam";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import {
  UserNotificationPreferenceService,
  type UserNotificationPreferencesDto,
} from "./UserNotificationPreferenceService";
import { NOTIFICATION_EVENT_CATALOG } from "./NotificationEventCatalog";

@Controller("me/notification-preferences")
@UseGuards(JwtAuthenticationGuard)
export class UserNotificationPreferencesController {
  public constructor(
    private readonly userNotificationPreferenceService: UserNotificationPreferenceService,
  ) {}

  @Get()
  public async get(@AuthenticatedUserParam() user: AuthenticatedUserContext) {
    return {
      preferences:
        await this.userNotificationPreferenceService.getForUser(user.userId),
    };
  }

  @Get("matrix")
  public async matrix(@AuthenticatedUserParam() user: AuthenticatedUserContext) {
    const preferences =
      await this.userNotificationPreferenceService.getForUser(user.userId);
    const events = NOTIFICATION_EVENT_CATALOG.map((row) => {
      const key = row.userPreferenceKey;
      const userToggle = key ? preferences[key] : row.defaultUserEnabled;
      const pushKey =
        key === "notifyNewOffers"
          ? "notifyPushNewOffers"
          : key === "notifyMessages"
            ? "notifyPushMessages"
            : key === "notifyAuctions"
              ? "notifyPushAuctions"
              : null;
      const pushToggle =
        pushKey != null ? preferences[pushKey] : null;
      return {
        eventCode: row.code,
        category: row.category,
        labelTr: row.labelTr,
        preferenceKey: key,
        pushPreferenceKey: pushKey,
        editable: key !== null,
        emailEnabled: userToggle,
        channels: {
          email: userToggle,
          push: pushToggle,
        },
      };
    });
    return { preferences, events };
  }

  @Patch()
  public async patch(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: Partial<UserNotificationPreferencesDto>,
  ) {
    if (body.aiMailAssistConsent !== undefined) {
      return {
        preferences:
          await this.userNotificationPreferenceService.setAiMailAssistConsent(
            user.userId,
            Boolean(body.aiMailAssistConsent),
          ),
      };
    }
    return {
      preferences: await this.userNotificationPreferenceService.updateForUser(
        user.userId,
        body,
      ),
    };
  }
}
