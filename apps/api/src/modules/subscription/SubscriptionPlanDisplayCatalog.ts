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
  customDomainAllowed?: boolean;
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
    tagline: "kullanici.lerta.com.tr — webmail, taslaklar, IMAP.",
    monthlyPriceEur: 0,
    annualPriceEur: 0,
    productLine: "lerta_mail",
    mailMaxSendsPerHour: 80,
    mailMaxMailboxes: 1,
    customDomainAllowed: false,
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
    customDomainAllowed: true,
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
