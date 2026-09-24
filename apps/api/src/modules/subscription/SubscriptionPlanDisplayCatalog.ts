/** Fiyatlandırma gösterimi (fatura entegrasyonu öncesi sabit katalog). */
export type SubscriptionPlanDisplayMeta = {
  planCode: string;
  displayName: string;
  tagline: string;
  monthlyPriceEur: number;
  annualPriceEur: number;
  recommended?: boolean;
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
