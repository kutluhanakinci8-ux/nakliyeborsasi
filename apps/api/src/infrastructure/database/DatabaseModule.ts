import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TypeOrmConfigurationFactory } from "./TypeOrmConfigurationFactory";
import { CompanyEntity } from "./entities/CompanyEntity";
import { UserAccountEntity } from "./entities/UserAccountEntity";
import { CompanyMembershipEntity } from "./entities/CompanyMembershipEntity";
import { SubscriptionPlanEntity } from "./entities/SubscriptionPlanEntity";
import { CompanySubscriptionEntity } from "./entities/CompanySubscriptionEntity";
import { FreightListingEntity } from "./entities/FreightListingEntity";
import { AuditLogEntity } from "./entities/AuditLogEntity";
import { AuctionSessionEntity } from "./entities/AuctionSessionEntity";
import { AuctionBidEntity } from "./entities/AuctionBidEntity";
import { MessageThreadEntity } from "./entities/MessageThreadEntity";
import { MessageEntity } from "./entities/MessageEntity";
import { CompanyTrustReviewEntity } from "./entities/CompanyTrustReviewEntity";
import { FleetDriverEntity } from "./entities/FleetDriverEntity";
import { FleetVehicleEntity } from "./entities/FleetVehicleEntity";
import { FleetDriverVehicleAssignmentEntity } from "./entities/FleetDriverVehicleAssignmentEntity";
import { FleetTelemetryDeviceEntity } from "./entities/FleetTelemetryDeviceEntity";
import { FleetTelemetryConsentLogEntity } from "./entities/FleetTelemetryConsentLogEntity";
import { FleetTelemetryEventEntity } from "./entities/FleetTelemetryEventEntity";
import { LogisticsPoiEntity } from "./entities/LogisticsPoiEntity";
import { EmailOutboxEntity } from "./entities/EmailOutboxEntity";
import { PlatformNotificationSettingEntity } from "./entities/PlatformNotificationSettingEntity";
import { EmailVerificationTokenEntity } from "./entities/EmailVerificationTokenEntity";
import { PasswordResetTokenEntity } from "./entities/PasswordResetTokenEntity";
import { PlatformGmailCredentialEntity } from "./entities/PlatformGmailCredentialEntity";
import { PlatformGmailOAuthStateEntity } from "./entities/PlatformGmailOAuthStateEntity";
import { EmailOutboxEngagementEventEntity } from "./entities/EmailOutboxEngagementEventEntity";
import { EmailOutboxClickTokenEntity } from "./entities/EmailOutboxClickTokenEntity";
import { EmailSuppressionEntity } from "./entities/EmailSuppressionEntity";
import { UserNotificationPreferenceEntity } from "./entities/UserNotificationPreferenceEntity";
import { CompanyNotificationPreferenceEntity } from "./entities/CompanyNotificationPreferenceEntity";
import { DatabaseSeedRunner } from "./seed/DatabaseSeedRunner";
import { SubscriptionCatalogModule } from "../../modules/subscription/SubscriptionCatalogModule";

@Global()
@Module({
  imports: [
    SubscriptionCatalogModule,
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigurationFactory,
    }),
    TypeOrmModule.forFeature([
      CompanyEntity,
      UserAccountEntity,
      CompanyMembershipEntity,
      SubscriptionPlanEntity,
      CompanySubscriptionEntity,
      FreightListingEntity,
      AuditLogEntity,
      AuctionSessionEntity,
      AuctionBidEntity,
      MessageThreadEntity,
      MessageEntity,
      CompanyTrustReviewEntity,
      FleetDriverEntity,
      FleetVehicleEntity,
      FleetDriverVehicleAssignmentEntity,
      FleetTelemetryDeviceEntity,
      FleetTelemetryConsentLogEntity,
      FleetTelemetryEventEntity,
      LogisticsPoiEntity,
      EmailOutboxEntity,
      PlatformNotificationSettingEntity,
      EmailVerificationTokenEntity,
      PasswordResetTokenEntity,
      PlatformGmailCredentialEntity,
      PlatformGmailOAuthStateEntity,
      EmailOutboxEngagementEventEntity,
      EmailOutboxClickTokenEntity,
      EmailSuppressionEntity,
      UserNotificationPreferenceEntity,
      CompanyNotificationPreferenceEntity,
    ]),
  ],
  providers: [DatabaseSeedRunner],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
