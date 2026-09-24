import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  CompanySubscriptionSnapshot,
  SubscriptionModuleCode,
  SubscriptionPlanDefinition,
  SubscriptionTierCode,
} from "@nakliyeborsasi/core";
import { CompanySubscriptionEntity } from "../../infrastructure/database/entities/CompanySubscriptionEntity";

@Injectable()
export class CompanySubscriptionPersistenceService {
  public constructor(
    @InjectRepository(CompanySubscriptionEntity)
    private readonly companySubscriptionRepository: Repository<CompanySubscriptionEntity>,
  ) {}

  public async getSnapshot(
    companyId: string,
  ): Promise<CompanySubscriptionSnapshot | null> {
    const activeSubscription = await this.companySubscriptionRepository.findOne({
      where: { companyId, isActive: true },
      relations: { plan: true },
    });
    if (!activeSubscription || !activeSubscription.plan) {
      return null;
    }
    const planEntity = activeSubscription.plan;
    const planDefinition = new SubscriptionPlanDefinition({
      planCode: planEntity.planCode,
      tierCode: planEntity.tierCode as SubscriptionTierCode,
      includedModules: planEntity.includedModuleCodes.map(
        (code) => code as SubscriptionModuleCode,
      ),
      maxConcurrentSearchTabs: planEntity.maxConcurrentSearchTabs,
      laneAnalyticsHistoryDays: planEntity.laneAnalyticsHistoryDays,
    });
    return new CompanySubscriptionSnapshot(companyId, planDefinition);
  }

  public async assignActivePlan(
    companyId: string,
    planCode: string,
  ): Promise<void> {
    await this.companySubscriptionRepository.update(
      { companyId, isActive: true },
      { isActive: false },
    );
    await this.companySubscriptionRepository.save(
      this.companySubscriptionRepository.create({
        companyId,
        planCode,
        isActive: true,
      }),
    );
  }
}
