import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { CompanyRoleCode } from "@nakliyeborsasi/core";
import { SubscriptionPlanEntity } from "../entities/SubscriptionPlanEntity";
import { CompanyEntity } from "../entities/CompanyEntity";
import { UserAccountEntity } from "../entities/UserAccountEntity";
import { CompanyMembershipEntity } from "../entities/CompanyMembershipEntity";
import { CompanySubscriptionEntity } from "../entities/CompanySubscriptionEntity";
import { FreightListingEntity } from "../entities/FreightListingEntity";
import { SubscriptionPlanCatalog } from "../../../modules/subscription/SubscriptionPlanCatalog";

@Injectable()
export class DatabaseSeedRunner implements OnModuleInit {
  public constructor(
    @InjectRepository(SubscriptionPlanEntity)
    private readonly subscriptionPlanRepository: Repository<SubscriptionPlanEntity>,
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,
    @InjectRepository(UserAccountEntity)
    private readonly userAccountRepository: Repository<UserAccountEntity>,
    @InjectRepository(CompanyMembershipEntity)
    private readonly companyMembershipRepository: Repository<CompanyMembershipEntity>,
    @InjectRepository(CompanySubscriptionEntity)
    private readonly companySubscriptionRepository: Repository<CompanySubscriptionEntity>,
    @InjectRepository(FreightListingEntity)
    private readonly freightListingRepository: Repository<FreightListingEntity>,
    private readonly subscriptionPlanCatalog: SubscriptionPlanCatalog,
  ) {}

  public async onModuleInit(): Promise<void> {
    await this.seedSubscriptionPlans();
    await this.seedDemoTenant();
  }

  private async seedSubscriptionPlans(): Promise<void> {
    const catalogPlans = this.subscriptionPlanCatalog.listPlans();
    for (const plan of catalogPlans) {
      const existing = await this.subscriptionPlanRepository.findOne({
        where: { planCode: plan.planCode },
      });
      if (existing) {
        continue;
      }
      await this.subscriptionPlanRepository.save(
        this.subscriptionPlanRepository.create({
          planCode: plan.planCode,
          tierCode: plan.tierCode,
          includedModuleCodes: [...plan.includedModules],
          maxConcurrentSearchTabs: plan.maxConcurrentSearchTabs,
          laneAnalyticsHistoryDays: plan.laneAnalyticsHistoryDays,
        }),
      );
    }
  }

  private async seedDemoTenant(): Promise<void> {
    const demoEmail = "demo@nakliyeborsasi.local";
    const existingUser = await this.userAccountRepository.findOne({
      where: { emailAddress: demoEmail },
    });
    if (existingUser) {
      return;
    }
    const company = await this.companyRepository.save(
      this.companyRepository.create({
        legalName: "Demo Logistics TR-UA",
        countryCode: "TR",
      }),
    );
    const passwordHash = await bcrypt.hash("DemoPass123!", 12);
    const user = await this.userAccountRepository.save(
      this.userAccountRepository.create({
        emailAddress: demoEmail,
        passwordHash,
        displayName: "Demo Dispatcher",
      }),
    );
    await this.companyMembershipRepository.save(
      this.companyMembershipRepository.create({
        companyId: company.id,
        userId: user.id,
        roleCode: CompanyRoleCode.Dispatcher,
      }),
    );
    await this.companySubscriptionRepository.save(
      this.companySubscriptionRepository.create({
        companyId: company.id,
        planCode: "carrier_professional_tr_ua",
        isActive: true,
      }),
    );
    await this.freightListingRepository.save(
      this.freightListingRepository.create({
        ownerCompanyId: company.id,
        originCountryCode: "TR",
        originCityName: "Ankara",
        destinationCountryCode: "UA",
        destinationCityName: "Odesa",
        equipmentTypeCode: "TAUTLINER",
        weightTonnes: "21.00",
        loadingDateStart: "2026-09-22",
        priceAmount: "2100.00",
        priceCurrencyCode: "EUR",
        marketScopeCode: "UA_EU",
      }),
    );
  }
}
