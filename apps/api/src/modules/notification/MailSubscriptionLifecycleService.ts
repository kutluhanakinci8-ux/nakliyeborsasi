import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import Stripe from "stripe";
import { Repository } from "typeorm";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import {
  MailBillingLifecycleStatus,
  MailOrganizationBillingStateEntity,
} from "../../infrastructure/database/entities/MailOrganizationBillingStateEntity";
import { MailSaasSubscriptionService } from "./MailSaasSubscriptionService";
const PILOT_PLAN = "lerta_mail_pilot_tr";

export type MailBillingLifecycleView = {
  status: MailBillingLifecycleStatus;
  billingProvider: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  graceEndsAt: string | null;
  inGrace: boolean;
  canSendMail: boolean;
  statusLabelTr: string;
  detailTr: string;
};

@Injectable()
export class MailSubscriptionLifecycleService {
  private readonly logger = new Logger(MailSubscriptionLifecycleService.name);

  public constructor(
    @InjectRepository(MailOrganizationBillingStateEntity)
    private readonly stateRepository: Repository<MailOrganizationBillingStateEntity>,
    @Inject(forwardRef(() => MailSaasSubscriptionService))
    private readonly mailSaasSubscriptionService: MailSaasSubscriptionService,
    private readonly configService: ConfigService,
  ) {}

  public async getLifecycleView(
    organizationId: string,
  ): Promise<MailBillingLifecycleView> {
    await this.applyGraceExpiryIfNeeded(organizationId);
    const row = await this.findOrCreate(organizationId);
    return this.toView(row);
  }

  public async assertCanUsePaidMailFeatures(
    organizationId: string,
  ): Promise<void> {
    const view = await this.getLifecycleView(organizationId);
    if (!view.canSendMail) {
      throw new BadRequestException(
        "Abonelik askıda — ödeme güncelleyin veya planı yenileyin.",
      );
    }
  }

  public async recordStripeCheckoutCompleted(params: {
    organizationId: string;
    subscriptionId: string | null;
    planCode: string;
  }): Promise<void> {
    const row = await this.findOrCreate(params.organizationId);
    row.billingProvider = "stripe";
    row.stripeSubscriptionId = params.subscriptionId;
    row.lifecycleStatus = "active";
    row.cancelAtPeriodEnd = false;
    row.graceEndsAt = null;
    row.lastPaymentFailedAt = null;
    await this.stateRepository.save(row);
    await this.mailSaasSubscriptionService.activateMailPlanForBilling(
      params.organizationId,
      params.planCode,
    );
    if (params.subscriptionId) {
      await this.syncStripeSubscription(params.subscriptionId);
    }
  }

  public async recordStripeInvoicePaid(organizationId: string): Promise<void> {
    const row = await this.findOrCreate(organizationId);
    row.lifecycleStatus = "active";
    row.graceEndsAt = null;
    row.lastPaymentFailedAt = null;
    await this.stateRepository.save(row);
  }

  public async recordStripePaymentFailed(
    organizationId: string,
  ): Promise<void> {
    const row = await this.findOrCreate(organizationId);
    const graceDays = this.resolveGraceDays();
    const graceEndsAt = new Date(Date.now() + graceDays * 24 * 60 * 60 * 1000);
    row.lifecycleStatus = "grace";
    row.graceEndsAt = graceEndsAt;
    row.lastPaymentFailedAt = new Date();
    await this.stateRepository.save(row);
    this.logger.warn(
      `Mail billing grace started org=${organizationId} until=${graceEndsAt.toISOString()}`,
    );
  }

  public async applyStripeSubscriptionEvent(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const organizationId = subscription.metadata?.organizationId;
    if (!organizationId) {
      return;
    }
    const row = await this.findOrCreate(organizationId);
    row.stripeSubscriptionId = subscription.id;
    row.billingProvider = "stripe";
    row.cancelAtPeriodEnd = subscription.cancel_at_period_end;
    row.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    if (subscription.status === "active") {
      row.lifecycleStatus = "active";
      if (!subscription.cancel_at_period_end) {
        row.graceEndsAt = null;
      }
    } else if (
      subscription.status === "past_due" ||
      subscription.status === "unpaid"
    ) {
      if (!row.graceEndsAt) {
        await this.recordStripePaymentFailed(organizationId);
      }
    } else if (
      subscription.status === "canceled" ||
      subscription.status === "incomplete_expired"
    ) {
      await this.downgradeToPilot(organizationId, "canceled");
      return;
    }
    await this.stateRepository.save(row);
  }

  public async syncStripeSubscription(subscriptionId: string): Promise<void> {
    const stripeKey = this.configService.get<string>("STRIPE_SECRET_KEY")?.trim();
    if (!stripeKey) {
      return;
    }
    const stripe = new Stripe(stripeKey);
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await this.applyStripeSubscriptionEvent(subscription);
  }

  public async requestCancelAtPeriodEnd(
    user: AuthenticatedUserContext,
  ): Promise<MailBillingLifecycleView> {
    const row = await this.findOrCreate(user.companyId);
    if (row.stripeSubscriptionId) {
      const stripeKey = this.configService
        .get<string>("STRIPE_SECRET_KEY")
        ?.trim();
      if (!stripeKey) {
        throw new BadRequestException("Stripe yapılandırılmadı.");
      }
      const stripe = new Stripe(stripeKey);
      await stripe.subscriptions.update(row.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
      row.cancelAtPeriodEnd = true;
      await this.stateRepository.save(row);
      await this.syncStripeSubscription(row.stripeSubscriptionId);
      return this.getLifecycleView(user.companyId);
    }
    await this.downgradeToPilot(user.companyId, "canceled");
    return this.getLifecycleView(user.companyId);
  }

  public async requestResumeSubscription(
    user: AuthenticatedUserContext,
  ): Promise<MailBillingLifecycleView> {
    const row = await this.findOrCreate(user.companyId);
    if (!row.stripeSubscriptionId) {
      throw new BadRequestException(
        "Yeniden açma yalnızca Stripe aboneliği için geçerli.",
      );
    }
    const stripeKey = this.configService.get<string>("STRIPE_SECRET_KEY")?.trim();
    if (!stripeKey) {
      throw new BadRequestException("Stripe yapılandırılmadı.");
    }
    const stripe = new Stripe(stripeKey);
    await stripe.subscriptions.update(row.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });
    row.cancelAtPeriodEnd = false;
    await this.stateRepository.save(row);
    await this.syncStripeSubscription(row.stripeSubscriptionId);
    return this.getLifecycleView(user.companyId);
  }

  public async recordManualTrialSelection(organizationId: string): Promise<void> {
    const row = await this.findOrCreate(organizationId);
    row.billingProvider = "manual";
    row.lifecycleStatus = "trialing";
    row.cancelAtPeriodEnd = false;
    row.graceEndsAt = null;
    await this.stateRepository.save(row);
  }

  public async processAllGraceExpiries(): Promise<number> {
    const now = new Date();
    const rows = await this.stateRepository.find({
      where: { lifecycleStatus: "grace" },
    });
    let count = 0;
    for (const row of rows) {
      if (row.graceEndsAt && row.graceEndsAt <= now) {
        await this.downgradeToPilot(row.organizationId, "past_due");
        count += 1;
      }
    }
    return count;
  }

  private async applyGraceExpiryIfNeeded(organizationId: string): Promise<void> {
    const row = await this.stateRepository.findOne({
      where: { organizationId },
    });
    if (
      row?.lifecycleStatus === "grace" &&
      row.graceEndsAt &&
      row.graceEndsAt <= new Date()
    ) {
      await this.downgradeToPilot(organizationId, "past_due");
    }
  }

  private async downgradeToPilot(
    organizationId: string,
    reason: MailBillingLifecycleStatus,
  ): Promise<void> {
    await this.mailSaasSubscriptionService.activateMailPlanForBilling(
      organizationId,
      PILOT_PLAN,
    );
    const row = await this.findOrCreate(organizationId);
    row.lifecycleStatus = reason === "canceled" ? "canceled" : "past_due";
    row.graceEndsAt = null;
    row.cancelAtPeriodEnd = false;
    row.currentPeriodEnd = null;
    await this.stateRepository.save(row);
    this.logger.warn(
      `Mail plan downgraded to pilot org=${organizationId} reason=${reason}`,
    );
  }

  private async findOrCreate(
    organizationId: string,
  ): Promise<MailOrganizationBillingStateEntity> {
    const existing = await this.stateRepository.findOne({
      where: { organizationId },
    });
    if (existing) {
      return existing;
    }
    return this.stateRepository.save(
      this.stateRepository.create({
        organizationId,
        billingProvider: "manual",
        lifecycleStatus: "trialing",
        stripeSubscriptionId: null,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
        graceEndsAt: null,
        lastPaymentFailedAt: null,
      }),
    );
  }

  private resolveGraceDays(): number {
    const raw = this.configService.get<string>("MAIL_BILLING_GRACE_DAYS");
    const parsed = raw ? Number.parseInt(raw, 10) : 7;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 7;
  }

  private toView(
    row: MailOrganizationBillingStateEntity,
  ): MailBillingLifecycleView {
    const inGrace = row.lifecycleStatus === "grace";
    const canSendMail =
      row.lifecycleStatus !== "canceled" &&
      row.lifecycleStatus !== "past_due";
    const { statusLabelTr, detailTr } = this.labelsFor(row);
    return {
      status: row.lifecycleStatus,
      billingProvider: row.billingProvider,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd,
      currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
      graceEndsAt: row.graceEndsAt?.toISOString() ?? null,
      inGrace,
      canSendMail,
      statusLabelTr,
      detailTr,
    };
  }

  private labelsFor(row: MailOrganizationBillingStateEntity): {
    statusLabelTr: string;
    detailTr: string;
  } {
    if (row.lifecycleStatus === "grace" && row.graceEndsAt) {
      return {
        statusLabelTr: "Ödeme gecikmesi — ek süre",
        detailTr: `Ödeme alınamadı. ${row.graceEndsAt.toLocaleDateString("tr-TR")} tarihine kadar Kurumsal özellikler açık; ardından Pilot plana düşülür.`,
      };
    }
    if (row.cancelAtPeriodEnd && row.currentPeriodEnd) {
      return {
        statusLabelTr: "İptal planlandı",
        detailTr: `Dönem sonu (${row.currentPeriodEnd.toLocaleDateString("tr-TR")}) itibarıyla abonelik sona erecek.`,
      };
    }
    switch (row.lifecycleStatus) {
      case "active":
        return {
          statusLabelTr: "Aktif abonelik",
          detailTr: row.currentPeriodEnd
            ? `Sonraki yenileme: ${row.currentPeriodEnd.toLocaleDateString("tr-TR")}`
            : "Ödeme güncel.",
        };
      case "trialing":
        return {
          statusLabelTr: "Deneme / manuel plan",
          detailTr: "Stripe aboneliği yok; konsoldan plan veya ödeme ile geçiş yapın.",
        };
      case "canceled":
        return {
          statusLabelTr: "Sonlandırıldı",
          detailTr: "Pilot plana düşürüldü. Kurumsal özellikler için yeniden ödeme yapın.",
        };
      case "past_due":
        return {
          statusLabelTr: "Ödeme gerekli",
          detailTr: "Ek süre doldu. Pilot plan aktif; gönderim kotası düşürüldü.",
        };
      default:
        return { statusLabelTr: row.lifecycleStatus, detailTr: "" };
    }
  }
}
