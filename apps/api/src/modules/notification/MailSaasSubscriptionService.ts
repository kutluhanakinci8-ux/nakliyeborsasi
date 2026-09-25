import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AuthorizationException,
  CompanyRoleCode,
  SubscriptionModuleCode,
} from "@nakliyeborsasi/core";
import { SubscriptionPlanCatalog } from "../subscription/SubscriptionPlanCatalog";
import { SubscriptionPlanDisplayCatalog } from "../subscription/SubscriptionPlanDisplayCatalog";
import { CompanySubscriptionPersistenceService } from "../subscription/CompanySubscriptionPersistenceService";

@Injectable()
export class MailSaasSubscriptionService {
  public constructor(
    private readonly subscriptionPlanCatalog: SubscriptionPlanCatalog,
    private readonly companySubscriptionPersistenceService: CompanySubscriptionPersistenceService,
  ) {}

  public listMailPlans() {
    return this.subscriptionPlanCatalog
      .listPlans()
      .filter((plan) =>
        plan.includedModules.includes(SubscriptionModuleCode.LertaMail),
      )
      .map((plan) => this.toMailPlanView(plan.planCode));
  }

  public async getOrganizationMailPlan(organizationId: string) {
    const snapshot =
      await this.companySubscriptionPersistenceService.getSnapshot(
        organizationId,
      );
    const planCode = snapshot?.activePlan.planCode ?? null;
    const isMailPlan =
      snapshot?.activePlan.includedModules.includes(
        SubscriptionModuleCode.LertaMail,
      ) ?? false;
    return {
      planCode,
      isMailPlan,
      plan: planCode ? this.toMailPlanView(planCode) : null,
      sendRate: this.resolveSendLimitForPlanCode(planCode),
    };
  }

  public resolveSendLimitForPlanCode(planCode: string | null): number {
    if (planCode) {
      const display = SubscriptionPlanDisplayCatalog.find(planCode);
      if (display?.mailMaxSendsPerHour) {
        return display.mailMaxSendsPerHour;
      }
    }
    return 200;
  }

  public async assertCustomDomainAllowed(organizationId: string): Promise<void> {
    const view = await this.getOrganizationMailPlan(organizationId);
    if (!view.plan?.customDomainAllowed) {
      throw new ForbiddenException(
        "Özel domain bu planda yok. Kurumsal plana geçin (lerta_mail_corporate_tr).",
      );
    }
  }

  public async selectMailPlan(
    organizationId: string,
    roleCodes: readonly string[],
    planCode: string,
  ) {
    if (
      !roleCodes.some(
        (role) =>
          role === CompanyRoleCode.CompanyOwner ||
          role === CompanyRoleCode.BillingAdmin,
      )
    ) {
      throw new AuthorizationException(
        "Plan değişikliği yalnızca firma sahibi veya faturalama yöneticisi.",
      );
    }
    const plan = this.subscriptionPlanCatalog.findPlanByCode(planCode);
    if (
      !plan ||
      !plan.includedModules.includes(SubscriptionModuleCode.LertaMail)
    ) {
      throw new NotFoundException("Geçersiz Lerta Mail planı");
    }
    await this.companySubscriptionPersistenceService.assignActivePlan(
      organizationId,
      planCode,
    );
    return this.getOrganizationMailPlan(organizationId);
  }

  public isMailPlanCode(planCode: string): boolean {
    const plan = this.subscriptionPlanCatalog.findPlanByCode(planCode);
    return (
      plan?.includedModules.includes(SubscriptionModuleCode.LertaMail) ?? false
    );
  }

  private toMailPlanView(planCode: string) {
    const display = SubscriptionPlanDisplayCatalog.find(planCode);
    const plan = this.subscriptionPlanCatalog.findPlanByCode(planCode);
    return {
      planCode,
      displayName: display?.displayName ?? planCode,
      tagline: display?.tagline ?? "",
      monthlyPriceEur: display?.monthlyPriceEur ?? 0,
      annualPriceEur: display?.annualPriceEur ?? 0,
      recommended: display?.recommended ?? false,
      mailMaxSendsPerHour: display?.mailMaxSendsPerHour ?? 80,
      customDomainAllowed: display?.customDomainAllowed ?? false,
      tierCode: plan?.tierCode ?? null,
    };
  }
}
