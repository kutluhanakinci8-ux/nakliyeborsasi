import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { LERTA_MAIL_CORPORATE_PLAN } from "./MailBillingService";
import { MailIyzicoApiClient } from "./MailIyzicoApiClient";
import { MailSaasSubscriptionService } from "./MailSaasSubscriptionService";

@Injectable()
export class MailIyzicoBillingService {
  private readonly logger = new Logger(MailIyzicoBillingService.name);

  public constructor(
    private readonly configService: ConfigService,
    private readonly mailSaasSubscriptionService: MailSaasSubscriptionService,
  ) {}

  public isConfigured(): boolean {
    return Boolean(
      this.configService.get<string>("IYZICO_API_KEY")?.trim() &&
        this.configService.get<string>("IYZICO_SECRET_KEY")?.trim(),
    );
  }

  public async createCorporateCheckout(
    user: AuthenticatedUserContext,
    params: { successUrl?: string; cancelUrl?: string },
  ): Promise<{ provider: "iyzico"; url: string | null; message?: string }> {
    const client = this.createClient();
    if (!client) {
      const pageUrl = this.configService
        .get<string>("IYZICO_CHECKOUT_PAGE_URL")
        ?.trim();
      if (!pageUrl) {
        return {
          provider: "iyzico",
          url: null,
          message: "iyzico API anahtarları veya IYZICO_CHECKOUT_PAGE_URL gerekli.",
        };
      }
      const success = encodeURIComponent(
        params.successUrl ??
          `${this.consoleBase()}/dashboard?billing=success`,
      );
      const url = `${pageUrl}${pageUrl.includes("?") ? "&" : "?"}organizationId=${encodeURIComponent(user.companyId)}&plan=${LERTA_MAIL_CORPORATE_PLAN}&successUrl=${success}`;
      return { provider: "iyzico", url };
    }

    const price = this.configService
      .get<string>("IYZICO_CORPORATE_PRICE_TRY")
      ?.trim() || "490.00";
    const callbackUrl =
      this.configService.get<string>("IYZICO_CALLBACK_URL")?.trim() ||
      `${this.apiPublicBase()}/webhooks/mail-billing/iyzico`;
    const conversationId = `mail-${user.companyId}-${Date.now()}`;

    const init = await client.initializeCheckoutForm({
      locale: "tr",
      conversationId,
      price,
      paidPrice: price,
      currency: "TRY",
      basketId: user.companyId,
      paymentGroup: "SUBSCRIPTION",
      callbackUrl,
      enabledInstallments: [1],
      buyer: {
        id: user.userId,
        name: "Lerta",
        surname: "Mail",
        gsmNumber: "+905350000000",
        email: user.emailAddress,
        identityNumber: "11111111111",
        registrationAddress: "Turkey",
        ip: "85.34.78.112",
        city: "Istanbul",
        country: "Turkey",
      },
      shippingAddress: {
        contactName: "Lerta Mail",
        city: "Istanbul",
        country: "Turkey",
        address: "Turkey",
      },
      billingAddress: {
        contactName: "Lerta Mail",
        city: "Istanbul",
        country: "Turkey",
        address: "Turkey",
      },
      basketItems: [
        {
          id: LERTA_MAIL_CORPORATE_PLAN,
          name: "Lerta Mail Kurumsal",
          category1: "SaaS",
          itemType: "VIRTUAL",
          price,
        },
      ],
    });

    if (init.status !== "success" || !init.paymentPageUrl) {
      this.logger.warn(
        `iyzico init: ${init.errorCode ?? ""} ${init.errorMessage ?? init.status}`,
      );
      throw new BadRequestException(
        init.errorMessage ?? "iyzico ödeme formu başlatılamadı.",
      );
    }

    return { provider: "iyzico", url: init.paymentPageUrl };
  }

  public async handleCallback(token: string): Promise<{
    ok: boolean;
    paymentStatus?: string;
    organizationId?: string;
  }> {
    const trimmed = token.trim();
    if (!trimmed) {
      throw new BadRequestException("token gerekli");
    }
    const client = this.createClient();
    if (!client) {
      throw new BadRequestException("iyzico API yapılandırılmadı.");
    }

    const detail = await client.retrieveCheckoutForm({
      locale: "tr",
      conversationId: `mail-callback-${Date.now()}`,
      token: trimmed,
    });

    if (detail.status !== "success") {
      throw new BadRequestException(
        detail.errorMessage ?? "iyzico ödeme doğrulanamadı.",
      );
    }

    const organizationId = this.resolveOrganizationId(detail);
    if (detail.paymentStatus === "SUCCESS" && organizationId) {
      await this.mailSaasSubscriptionService.activateMailPlanForBilling(
        organizationId,
        LERTA_MAIL_CORPORATE_PLAN,
      );
      return {
        ok: true,
        paymentStatus: detail.paymentStatus,
        organizationId,
      };
    }

    return {
      ok: detail.paymentStatus === "SUCCESS",
      paymentStatus: detail.paymentStatus,
      organizationId: organizationId ?? undefined,
    };
  }

  private resolveOrganizationId(
    detail: { basketId?: string; conversationId?: string },
  ): string | null {
    if (detail.basketId?.match(/^[0-9a-f-]{36}$/i)) {
      return detail.basketId;
    }
    const fromConversation = detail.conversationId?.match(
      /^mail-([0-9a-f-]{36})-/i,
    );
    return fromConversation?.[1] ?? null;
  }

  private createClient(): MailIyzicoApiClient | null {
    const apiKey = this.configService.get<string>("IYZICO_API_KEY")?.trim();
    const secretKey = this.configService
      .get<string>("IYZICO_SECRET_KEY")
      ?.trim();
    if (!apiKey || !secretKey) {
      return null;
    }
    const baseUrl =
      this.configService.get<string>("IYZICO_BASE_URL")?.trim() ||
      "https://sandbox-api.iyzipay.com";
    return new MailIyzicoApiClient(apiKey, secretKey, baseUrl);
  }

  private consoleBase(): string {
    return (
      this.configService.get<string>("MAIL_CONSOLE_PUBLIC_URL")?.trim() ||
      "https://yonetim.lerta.com.tr"
    );
  }

  private apiPublicBase(): string {
    return (
      this.configService.get<string>("MAIL_API_PUBLIC_URL")?.trim() ||
      "https://yonetim.lerta.com.tr/api/v1"
    );
  }
}
