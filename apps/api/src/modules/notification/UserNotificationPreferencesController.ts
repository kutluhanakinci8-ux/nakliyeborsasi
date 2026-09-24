import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { AuthenticatedUserParam } from "../auth/AuthenticatedUserParam";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import {
  UserNotificationPreferenceService,
  type UserNotificationPreferencesDto,
} from "./UserNotificationPreferenceService";

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

  @Patch()
  public async patch(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: Partial<UserNotificationPreferencesDto>,
  ) {
    return {
      preferences: await this.userNotificationPreferenceService.updateForUser(
        user.userId,
        body,
      ),
    };
  }
}
