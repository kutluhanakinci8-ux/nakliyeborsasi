import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailSenderIdentityEntity } from "../../infrastructure/database/entities/MailSenderIdentityEntity";
import {
  AuthorizationException,
  CompanyRoleCode,
  SubscriptionModuleCode,
} from "@nakliyeborsasi/core";
import { SubscriptionPlanCatalog } from "../subscription/SubscriptionPlanCatalog";
import { SubscriptionPlanDisplayCatalog } from "../subscription/SubscriptionPlanDisplayCatalog";
import { CompanySubscriptionPersistenceService } from "../subscription/CompanySubscriptionPersistenceService";
import { MailSubscriptionLifecycleService } from "./MailSubscriptionLifecycleService";

@Injectable()
export class MailSaasSubscriptionService {
  public constructor(
    private readonly subscriptionPlanCatalog: SubscriptionPlanCatalog,
    private readonly companySubscriptionPersistenceService: CompanySubscriptionPersistenceService,
    @InjectRepository(MailSenderIdentityEntity)
    private readonly senderRepository: Repository<MailSenderIdentityEntity>,
    @Inject(forwardRef(() => MailSubscriptionLifecycleService))
    private readonly mailSubscriptionLifecycleService: MailSubscriptionLifecycleService,
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
    const mailboxLimit = this.resolveMailboxLimitForPlanCode(planCode);
    const mailboxUsed = await this.countMailboxes(organizationId);
    return {
      planCode,
      isMailPlan,
      plan: planCode ? this.toMailPlanView(planCode) : null,
      sendRate: this.resolveSendLimitForPlanCode(planCode),
      mailboxQuota: {
        used: mailboxUsed,
        limit: mailboxLimit,
      },
      storageLimitBytes: this.resolveStorageLimitBytesForPlanCode(planCode),
      maxAttachmentBytes: this.resolveMaxAttachmentBytesForPlanCode(planCode),
    };
  }

  public async countMailboxes(organizationId: string): Promise<number> {
    return this.senderRepository.count({ where: { organizationId } });
  }

  public async listOrganizationSenders(organizationId: string) {
    const senders = await this.senderRepository.find({
      where: { organizationId },
      relations: { mailDomain: true },
      order: { isDefault: "DESC", createdAt: "ASC" },
    });
    return senders.map((sender) => ({
      id: sender.id,
      localPart: sender.localPart,
      displayName: sender.displayName,
      isDefault: sender.isDefault,
      domain: sender.mailDomain?.domain ?? "",
      fromAddress: sender.mailDomain
        ? `${sender.localPart}@${sender.mailDomain.domain}`
        : `${sender.localPart}@`,
      createdAt: sender.createdAt.toISOString(),
    }));
  }

  public async setDefaultSender(
    organizationId: string,
    senderId: string,
  ): Promise<void> {
    const sender = await this.senderRepository.findOne({
      where: { id: senderId, organizationId },
    });
    if (!sender) {
      throw new NotFoundException("Gönderen adresi bulunamadı.");
    }
    await this.senderRepository.update(
      { organizationId, isDefault: true },
      { isDefault: false },
    );
    sender.isDefault = true;
    await this.senderRepository.save(sender);
  }

  public resolveMailboxLimitForPlanCode(planCode: string | null): number {
    if (planCode) {
      const display = SubscriptionPlanDisplayCatalog.find(planCode);
      if (display?.mailMaxMailboxes) {
        return display.mailMaxMailboxes;
      }
    }
    return 1;
  }

  public async assertMailboxQuota(
    organizationId: string,
    additionalSlots = 1,
  ): Promise<void> {
    const snapshot =
      await this.companySubscriptionPersistenceService.getSnapshot(
        organizationId,
      );
    const limit = this.resolveMailboxLimitForPlanCode(
      snapshot?.activePlan.planCode ?? null,
    );
    const used = await this.countMailboxes(organizationId);
    if (used + additionalSlots > limit) {
      throw new ForbiddenException(
        `Kutu limiti doldu (${used}/${limit}). Planı yükseltin veya ödeme yapın.`,
      );
    }
  }

  /** Stripe / iyzico webhook — rol kontrolü yok. */
  public async activateMailPlanForBilling(
    organizationId: string,
    planCode: string,
  ): Promise<void> {
    const plan = this.subscriptionPlanCatalog.findPlanByCode(planCode);
    if (
      !plan ||
      !plan.includedModules.includes(SubscriptionModuleCode.LertaMail)
    ) {
      throw new BadRequestException("Geçersiz mail plan kodu (billing).");
    }
    await this.companySubscriptionPersistenceService.assignActivePlan(
      organizationId,
      planCode,
    );
  }

  public resolveStorageLimitBytesForPlanCode(planCode: string | null): number {
    if (planCode) {
      const display = SubscriptionPlanDisplayCatalog.find(planCode);
      if (display?.mailStorageLimitBytes) {
        return display.mailStorageLimitBytes;
      }
    }
    return 2 * 1024 * 1024 * 1024;
  }

  public resolveMaxAttachmentBytesForPlanCode(planCode: string | null): number {
    if (planCode) {
      const display = SubscriptionPlanDisplayCatalog.find(planCode);
      if (display?.mailMaxAttachmentBytes) {
        return display.mailMaxAttachmentBytes;
      }
    }
    return 2 * 1024 * 1024;
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
    await this.mailSubscriptionLifecycleService.recordManualTrialSelection(
      organizationId,
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
      mailMaxMailboxes: display?.mailMaxMailboxes ?? 1,
      mailStorageLimitGb:
        Math.round(
          ((display?.mailStorageLimitBytes ??
            2 * 1024 * 1024 * 1024) /
            (1024 ** 3)) *
            10,
        ) / 10,
      mailMaxAttachmentMb:
        Math.round(
          ((display?.mailMaxAttachmentBytes ?? 2 * 1024 * 1024) /
            (1024 * 1024)) *
            10,
        ) / 10,
      customDomainAllowed: display?.customDomainAllowed ?? false,
      mailWhiteLabelAllowed: display?.mailWhiteLabelAllowed ?? false,
      mailPublicApiAllowed: display?.mailPublicApiAllowed ?? false,
      tierCode: plan?.tierCode ?? null,
    };
  }
}
