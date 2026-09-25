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

export const LERTA_MAIL_CORPORATE_PLAN = "lerta_mail_corporate_tr";

@Injectable()
export class MailBillingService {
  private readonly logger = new Logger(MailBillingService.name);

  public constructor(
    private readonly configService: ConfigService,
    private readonly mailSaasSubscriptionService: MailSaasSubscriptionService,
  ) {}

  public async createCorporateCheckout(
    user: AuthenticatedUserContext,
    params: { successUrl?: string; cancelUrl?: string },
  ): Promise<{
    provider: "stripe" | "iyzico" | "manual";
    url: string | null;
    message?: string;
  }> {
    this.assertBillingRole(user);
    const provider =
      this.configService.get<string>("MAIL_BILLING_PROVIDER")?.trim() ||
      "stripe";

    if (provider === "iyzico") {
      return this.createIyzicoCheckout(user.companyId, params);
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

    if (
      event.type === "checkout.session.completed" ||
      event.type === "invoice.paid"
    ) {
      const organizationId = this.extractOrganizationId(event);
      const planCode =
        this.extractPlanCode(event) ?? LERTA_MAIL_CORPORATE_PLAN;
      if (organizationId) {
        await this.mailSaasSubscriptionService.activateMailPlanForBilling(
          organizationId,
          planCode,
        );
      }
    }

    return { ok: true };
  }

  private createIyzicoCheckout(
    organizationId: string,
    params: { successUrl?: string; cancelUrl?: string },
  ): { provider: "iyzico"; url: string | null; message?: string } {
    const pageUrl = this.configService
      .get<string>("IYZICO_CHECKOUT_PAGE_URL")
      ?.trim();
    if (!pageUrl) {
      return {
        provider: "iyzico",
        url: null,
        message:
          "iyzico ödeme sayfası (IYZICO_CHECKOUT_PAGE_URL) tanımlı değil.",
      };
    }
    const baseConsole =
      this.configService.get<string>("MAIL_CONSOLE_PUBLIC_URL")?.trim() ||
      "https://yonetim.lerta.com.tr";
    const success = encodeURIComponent(
      params.successUrl ?? `${baseConsole}/dashboard?billing=success`,
    );
    const url = `${pageUrl}${pageUrl.includes("?") ? "&" : "?"}organizationId=${encodeURIComponent(organizationId)}&plan=${LERTA_MAIL_CORPORATE_PLAN}&successUrl=${success}`;
    return { provider: "iyzico", url };
  }

  private extractOrganizationId(event: Stripe.Event): string | null {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      return (
        session.metadata?.organizationId ??
        session.client_reference_id ??
        null
      );
    }
    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      return invoice.metadata?.organizationId ?? null;
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

  private assertBillingRole(user: AuthenticatedUserContext): void {
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
