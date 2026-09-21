import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from "@nestjs/typeorm";
import { CompanyEntity } from "./entities/CompanyEntity";
import { UserAccountEntity } from "./entities/UserAccountEntity";
import { CompanyMembershipEntity } from "./entities/CompanyMembershipEntity";
import { SubscriptionPlanEntity } from "./entities/SubscriptionPlanEntity";
import { CompanySubscriptionEntity } from "./entities/CompanySubscriptionEntity";
import { FreightListingEntity } from "./entities/FreightListingEntity";
import { AuditLogEntity } from "./entities/AuditLogEntity";

@Injectable()
export class TypeOrmConfigurationFactory implements TypeOrmOptionsFactory {
  public constructor(private readonly configService: ConfigService) {}

  public createTypeOrmOptions(): TypeOrmModuleOptions {
    const databaseUrl = this.configService.get<string>("DATABASE_URL");
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required");
    }
    const synchronize =
      this.configService.get<string>("TYPEORM_SYNCHRONIZE") === "true";
    return {
      type: "postgres",
      url: databaseUrl,
      entities: [
        CompanyEntity,
        UserAccountEntity,
        CompanyMembershipEntity,
        SubscriptionPlanEntity,
        CompanySubscriptionEntity,
        FreightListingEntity,
        AuditLogEntity,
      ],
      synchronize,
      logging: false,
    };
  }
}
