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
    ]),
  ],
  providers: [DatabaseSeedRunner],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
