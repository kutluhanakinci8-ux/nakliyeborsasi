import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { AuthenticatedUserContext, CompanyRoleCode } from "@nakliyeborsasi/core";
import { MailSaasSubscriptionService } from "./MailSaasSubscriptionService";
import { MailIyzicoBillingService } from "./MailIyzicoBillingService";
import { MailSubscriptionLifecycleService } from "./MailSubscriptionLifecycleService";

export const LERTA_MAIL_CORPORATE_PLAN = "lerta_mail_corporate_tr";

export type MailBillingStatus = {
  provider: string;
  checkout: {
    canStart: boolean;
    blockers: string[];
  };
  stripe: {
    configured: boolean;
    testMode: boolean;
    webhookConfigured: boolean;
    corporatePriceConfigured: boolean;
    corporatePriceValid: boolean | null;
    apiReachable: boolean | null;
    apiError: string | null;
  };
  iyzico: {
    apiConfigured: boolean;
    fallbackCheckoutUrlConfigured: boolean;
    callbackUrl: string;
    corporatePriceTry: string;
  };
};

@Injectable()
export class MailBillingService {
  private readonly logger = new Logger(MailBillingService.name);

  public constructor(
    private readonly configService: ConfigService,
    private readonly mailSaasSubscriptionService: MailSaasSubscriptionService,
    private readonly mailIyzicoBillingService: MailIyzicoBillingService,
    private readonly mailSubscriptionLifecycleService: MailSubscriptionLifecycleService,
  ) {}

  public async createCorporateCheckout(
    user: AuthenticatedUserContext,
    params: { successUrl?: string; cancelUrl?: string },
  ): Promise<{
    provider: "stripe" | "iyzico" | "manual";
    url: string | null;
    message?: string;
  }> {
    this.assertBillingRoleForUser(user);
    const provider =
      this.configService.get<string>("MAIL_BILLING_PROVIDER")?.trim() ||
      "stripe";

    if (provider === "iyzico") {
      return this.mailIyzicoBillingService.createCorporateCheckout(user, params);
    }

    const stripeKey = this.configService
      .get<string>("STRIPE_SECRET_KEY")
      ?.trim();
    if (!stripeKey) {
      return {
        provider: "manual",
        url: null,
        message:
          "Stripe yapılandırılmadı. Geçici olarak konsoldan plan seçebilir veya destek ile iletişime geçin.",
      };
    }

    const priceId = this.configService
      .get<string>("STRIPE_MAIL_CORPORATE_PRICE_ID")
      ?.trim();
    if (!priceId) {
      throw new BadRequestException(
        "STRIPE_MAIL_CORPORATE_PRICE_ID tanımlı değil.",
      );
    }

    const stripe = new Stripe(stripeKey);
    try {
      const price = await stripe.prices.retrieve(priceId);
      if (!price.active) {
        throw new BadRequestException(
          "Stripe price pasif veya geçersiz. Dashboard'da aktif bir price seçin.",
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.warn(
        `Stripe price doğrulama: ${error instanceof Error ? error.message : error}`,
      );
      throw new BadRequestException(
        "STRIPE_MAIL_CORPORATE_PRICE_ID Stripe'da bulunamadı.",
      );
    }

    const baseConsole =
      this.configService.get<string>("MAIL_CONSOLE_PUBLIC_URL")?.trim() ||
      "https://yonetim.lerta.com.tr";
    const successUrl =
      params.successUrl?.trim() ||
      `${baseConsole}/dashboard?billing=success`;
    const cancelUrl =
      params.cancelUrl?.trim() ||
      `${baseConsole}/dashboard?billing=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: user.emailAddress,
      client_reference_id: user.companyId,
      metadata: {
        organizationId: user.companyId,
        planCode: LERTA_MAIL_CORPORATE_PLAN,
        userId: user.userId,
      },
      subscription_data: {
        metadata: {
          organizationId: user.companyId,
          planCode: LERTA_MAIL_CORPORATE_PLAN,
        },
      },
    });

    if (!session.url) {
      throw new ServiceUnavailableException("Stripe oturumu oluşturulamadı.");
    }

    return { provider: "stripe", url: session.url };
  }

  public async handleStripeWebhook(
    rawBody: Buffer,
    signature: string | undefined,
  ): Promise<{ ok: boolean }> {
    const secret = this.configService
      .get<string>("STRIPE_WEBHOOK_SECRET")
      ?.trim();
    const stripeKey = this.configService
      .get<string>("STRIPE_SECRET_KEY")
      ?.trim();
    if (!secret || !stripeKey || !signature) {
      throw new BadRequestException("Stripe webhook yapılandırması eksik.");
    }

    const stripe = new Stripe(stripeKey);
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (error) {
      this.logger.warn(
        `Stripe webhook doğrulama: ${error instanceof Error ? error.message : error}`,
      );
      throw new BadRequestException("Geçersiz Stripe imzası.");
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const organizationId =
        session.metadata?.organizationId ??
        session.client_reference_id ??
        null;
      const planCode =
        session.metadata?.planCode ?? LERTA_MAIL_CORPORATE_PLAN;
      const subscriptionRef = session.subscription;
      const subscriptionId =
        typeof subscriptionRef === "string"
          ? subscriptionRef
          : subscriptionRef?.id ?? null;
      if (organizationId) {
        await this.mailSubscriptionLifecycleService.recordStripeCheckoutCompleted(
          {
            organizationId,
            subscriptionId,
            planCode,
          },
        );
      } else {
        this.logger.warn(
          "Stripe checkout.session.completed: organizationId bulunamadı.",
        );
      }
    }

    if (event.type === "invoice.paid") {
      const organizationId = await this.extractOrganizationId(stripe, event);
      const planCode =
        this.extractPlanCode(event) ?? LERTA_MAIL_CORPORATE_PLAN;
      if (organizationId) {
        await this.mailSubscriptionLifecycleService.recordStripeInvoicePaid(
          organizationId,
        );
        await this.mailSaasSubscriptionService.activateMailPlanForBilling(
          organizationId,
          planCode,
        );
      }
    }

    if (event.type === "invoice.payment_failed") {
      const organizationId = await this.extractOrganizationId(stripe, event);
      if (organizationId) {
        await this.mailSubscriptionLifecycleService.recordStripePaymentFailed(
          organizationId,
        );
      }
    }

    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      await this.mailSubscriptionLifecycleService.applyStripeSubscriptionEvent(
        subscription,
      );
    }

    return { ok: true };
  }

  public async getBillingStatus(): Promise<MailBillingStatus> {
    const provider =
      this.configService.get<string>("MAIL_BILLING_PROVIDER")?.trim() ||
      "stripe";
    const stripeKey = this.configService
      .get<string>("STRIPE_SECRET_KEY")
      ?.trim();
    const webhookSecret = this.configService
      .get<string>("STRIPE_WEBHOOK_SECRET")
      ?.trim();
    const priceId = this.configService
      .get<string>("STRIPE_MAIL_CORPORATE_PRICE_ID")
      ?.trim();
    const apiPublic =
      this.configService.get<string>("MAIL_API_PUBLIC_URL")?.trim() ||
      "https://yonetim.lerta.com.tr/api/v1";
    const callbackUrl =
      this.configService.get<string>("IYZICO_CALLBACK_URL")?.trim() ||
      `${apiPublic}/webhooks/mail-billing/iyzico`;
    const corporateTry =
      this.configService.get<string>("IYZICO_CORPORATE_PRICE_TRY")?.trim() ||
      "490.00";

    let apiReachable: boolean | null = null;
    let apiError: string | null = null;
    let corporatePriceValid: boolean | null = null;
    const blockers: string[] = [];

    if (provider === "stripe") {
      if (!stripeKey) {
        blockers.push("STRIPE_SECRET_KEY tanımlı değil");
      }
      if (!priceId) {
        blockers.push("STRIPE_MAIL_CORPORATE_PRICE_ID tanımlı değil");
      }
      if (!webhookSecret) {
        blockers.push(
          "STRIPE_WEBHOOK_SECRET eksik (ödeme sonrası plan otomatik açılmaz)",
        );
      }
    }

    if (stripeKey) {
      try {
        const stripe = new Stripe(stripeKey);
        await stripe.balance.retrieve();
        apiReachable = true;
        if (priceId) {
          const price = await stripe.prices.retrieve(priceId);
          corporatePriceValid = price.active;
          if (!price.active) {
            blockers.push("Stripe price pasif");
          }
        }
      } catch (error) {
        apiReachable = false;
        apiError =
          error instanceof Error ? error.message : "Stripe API hatası";
        blockers.push(`Stripe API: ${apiError}`);
        this.logger.warn(`Stripe bağlantı testi: ${apiError}`);
      }
    }

    const canStart =
      provider === "iyzico"
        ? this.mailIyzicoBillingService.isConfigured()
        : Boolean(stripeKey && priceId && apiReachable && corporatePriceValid);

    return {
      provider,
      checkout: {
        canStart,
        blockers,
      },
      stripe: {
        configured: Boolean(stripeKey),
        testMode: Boolean(stripeKey?.startsWith("sk_test_")),
        webhookConfigured: Boolean(webhookSecret),
        corporatePriceConfigured: Boolean(priceId),
        corporatePriceValid,
        apiReachable,
        apiError,
      },
      iyzico: {
        apiConfigured: this.mailIyzicoBillingService.isConfigured(),
        fallbackCheckoutUrlConfigured: Boolean(
          this.configService.get<string>("IYZICO_CHECKOUT_PAGE_URL")?.trim(),
        ),
        callbackUrl,
        corporatePriceTry: corporateTry,
      },
    };
  }

  public async handleIyzicoCallback(token: string): Promise<{
    ok: boolean;
    paymentStatus?: string;
    organizationId?: string;
  }> {
    return this.mailIyzicoBillingService.handleCallback(token);
  }

  public consoleBillingSuccessUrl(): string {
    const baseConsole =
      this.configService.get<string>("MAIL_CONSOLE_PUBLIC_URL")?.trim() ||
      "https://yonetim.lerta.com.tr";
    return `${baseConsole}/dashboard?billing=success`;
  }

  public consoleBillingCancelUrl(): string {
    const baseConsole =
      this.configService.get<string>("MAIL_CONSOLE_PUBLIC_URL")?.trim() ||
      "https://yonetim.lerta.com.tr";
    return `${baseConsole}/dashboard?billing=cancel`;
  }

  private async extractOrganizationId(
    stripe: Stripe,
    event: Stripe.Event,
  ): Promise<string | null> {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      return (
        session.metadata?.organizationId ??
        session.client_reference_id ??
        null
      );
    }
    if (
      event.type === "invoice.paid" ||
      event.type === "invoice.payment_failed"
    ) {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.metadata?.organizationId) {
        return invoice.metadata.organizationId;
      }
      const subscriptionRef = invoice.subscription;
      const subscriptionId =
        typeof subscriptionRef === "string"
          ? subscriptionRef
          : subscriptionRef?.id;
      if (!subscriptionId) {
        return null;
      }
      try {
        const subscription =
          await stripe.subscriptions.retrieve(subscriptionId);
        return subscription.metadata?.organizationId ?? null;
      } catch (error) {
        this.logger.warn(
          `Stripe subscription metadata: ${error instanceof Error ? error.message : error}`,
        );
        return null;
      }
    }
    return null;
  }

  private extractPlanCode(event: Stripe.Event): string | null {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      return session.metadata?.planCode ?? null;
    }
    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      return invoice.metadata?.planCode ?? null;
    }
    return null;
  }

  public assertBillingRoleForUser(user: AuthenticatedUserContext): void {
    if (
      !user.roleCodes.some(
        (role) =>
          role === CompanyRoleCode.CompanyOwner ||
          role === CompanyRoleCode.BillingAdmin,
      )
    ) {
      throw new BadRequestException(
        "Ödeme yalnızca firma sahibi veya faturalama yöneticisi tarafından başlatılabilir.",
      );
    }
  }
}
