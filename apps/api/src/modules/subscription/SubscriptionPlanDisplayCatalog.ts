/** Fiyatlandırma gösterimi (fatura entegrasyonu öncesi sabit katalog). */
export type SubscriptionPlanDisplayMeta = {
  planCode: string;
  displayName: string;
  tagline: string;
  monthlyPriceEur: number;
  annualPriceEur: number;
  recommended?: boolean;
  productLine?: "logistics" | "lerta_mail";
  mailMaxSendsPerHour?: number;
  mailMaxMailboxes?: number;
  /** Plan depolama üst sınırı (bayt). */
  mailStorageLimitBytes?: number;
  /** Tek ek üst sınırı (bayt). */
  mailMaxAttachmentBytes?: number;
  customDomainAllowed?: boolean;
  mailWhiteLabelAllowed?: boolean;
  mailPublicApiAllowed?: boolean;
  /** Vitrin / iyzico (A7) — aylık TRY gösterimi */
  monthlyPriceTry?: number;
  annualPriceTry?: number;
};

const DISPLAY: readonly SubscriptionPlanDisplayMeta[] = [
  {
    planCode: "carrier_starter_tr_ua",
    displayName: "Starter",
    tagline: "Arama, ihale ve filo temel modülleri — küçük taşıyıcılar.",
    monthlyPriceEur: 79,
    annualPriceEur: 790,
  },
  {
    planCode: "carrier_professional_tr_ua",
    displayName: "Professional",
    tagline: "Mesajlaşma, güven, telematik ve koridor analitiği.",
    monthlyPriceEur: 149,
    annualPriceEur: 1490,
    recommended: true,
  },
  {
    planCode: "forwarder_enterprise_tr_ua",
    displayName: "Enterprise",
    tagline: "API, gelişmiş analitik ve global ölçek operasyon.",
    monthlyPriceEur: 349,
    annualPriceEur: 3490,
    productLine: "logistics",
  },
  {
    planCode: "lerta_mail_pilot_tr",
    displayName: "Pilot",
    tagline: "@lerta.com.tr — webmail, taslaklar, IMAP.",
    monthlyPriceEur: 0,
    annualPriceEur: 0,
    productLine: "lerta_mail",
    mailMaxSendsPerHour: 80,
    mailMaxMailboxes: 1,
    mailStorageLimitBytes: 2 * 1024 * 1024 * 1024,
    mailMaxAttachmentBytes: 2 * 1024 * 1024,
    customDomainAllowed: false,
    monthlyPriceTry: 0,
  },
  {
    planCode: "lerta_mail_corporate_tr",
    displayName: "Kurumsal",
    tagline: "Özel domain, MX sihirbazı, yükseltilmiş gönderim kotası.",
    monthlyPriceEur: 49,
    annualPriceEur: 490,
    recommended: true,
    productLine: "lerta_mail",
    mailMaxSendsPerHour: 500,
    mailMaxMailboxes: 25,
    mailStorageLimitBytes: 25 * 1024 * 1024 * 1024,
    mailMaxAttachmentBytes: 10 * 1024 * 1024,
    customDomainAllowed: true,
    monthlyPriceTry: 490,
    annualPriceTry: 4900,
  },
  {
    planCode: "lerta_mail_enterprise_tr",
    displayName: "Enterprise",
    tagline: "White-label e-posta, logo, From adı ve yükseltilmiş kota.",
    monthlyPriceEur: 149,
    annualPriceEur: 1490,
    productLine: "lerta_mail",
    mailMaxSendsPerHour: 2000,
    mailMaxMailboxes: 100,
    mailStorageLimitBytes: 100 * 1024 * 1024 * 1024,
    mailMaxAttachmentBytes: 25 * 1024 * 1024,
    customDomainAllowed: true,
    mailWhiteLabelAllowed: true,
    mailPublicApiAllowed: true,
    monthlyPriceTry: 1490,
    annualPriceTry: 14900,
  },
];

export class SubscriptionPlanDisplayCatalog {
  public static list(): readonly SubscriptionPlanDisplayMeta[] {
    return DISPLAY;
  }

  public static find(planCode: string): SubscriptionPlanDisplayMeta | null {
    return DISPLAY.find((plan) => plan.planCode === planCode) ?? null;
  }
}
