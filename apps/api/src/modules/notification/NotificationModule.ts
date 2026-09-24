import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmailOutboxEntity } from "../../infrastructure/database/entities/EmailOutboxEntity";
import { PlatformNotificationSettingEntity } from "../../infrastructure/database/entities/PlatformNotificationSettingEntity";
import { EmailVerificationTokenEntity } from "../../infrastructure/database/entities/EmailVerificationTokenEntity";
import { PasswordResetTokenEntity } from "../../infrastructure/database/entities/PasswordResetTokenEntity";
import { UserAccountEntity } from "../../infrastructure/database/entities/UserAccountEntity";
import { CompanyEntity } from "../../infrastructure/database/entities/CompanyEntity";
import { AuthModule } from "../auth/AuthModule";
import { NotificationConfigurationService } from "./NotificationConfigurationService";
import { EmailTemplateService } from "./EmailTemplateService";
import { SmtpEmailSender } from "./SmtpEmailSender";
import { EmailOutboxService } from "./EmailOutboxService";
import { PlatformNotificationSettingsService } from "./PlatformNotificationSettingsService";
import { AuthNotificationService } from "./AuthNotificationService";
import { EmailSecurityTokenService } from "./EmailSecurityTokenService";
import { PlatformNotificationAdminController } from "./PlatformNotificationAdminController";
import { EmailOutboxProcessor } from "./EmailOutboxProcessor";
import { EmailDeliveryHealthService } from "./EmailDeliveryHealthService";

@Module({
  imports: [
    forwardRef(() => AuthModule),
    TypeOrmModule.forFeature([
      EmailOutboxEntity,
      PlatformNotificationSettingEntity,
      EmailVerificationTokenEntity,
      PasswordResetTokenEntity,
      UserAccountEntity,
      CompanyEntity,
    ]),
  ],
  controllers: [PlatformNotificationAdminController],
  providers: [
    NotificationConfigurationService,
    EmailTemplateService,
    SmtpEmailSender,
    EmailOutboxService,
    PlatformNotificationSettingsService,
    AuthNotificationService,
    EmailSecurityTokenService,
    EmailOutboxProcessor,
    EmailDeliveryHealthService,
  ],
  exports: [
    AuthNotificationService,
    EmailSecurityTokenService,
    EmailOutboxService,
    PlatformNotificationSettingsService,
  ],
})
export class NotificationModule {}
