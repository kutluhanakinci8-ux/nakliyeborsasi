export type NormalizedFreightOfferDto = {
  externalReferenceId: string;
  providerCode: string;
  origin: { countryCode: string; cityName: string };
  destination: { countryCode: string; cityName: string };
  equipmentType: string;
  dimensions: { weightTonnes: number; volumeCubicMeters: number | null };
  loadingDateStart: string;
  loadingDateEnd: string | null;
  price: { amount: number; currencyCode: string } | null;
  marketScope: string;
};

export type IntegrationSearchResponse = {
  message: string;
  companyId: string;
  data: {
    offers: NormalizedFreightOfferDto[];
    failures: { providerCode: string; message: string }[];
  };
};

const PROVIDER_LABELS: Record<string, string> = {
  LARDI_TRANS: "Lardi-Trans",
  DELLA: "Della",
  DAT: "DAT",
  TRUCKSTOP: "Truckstop",
  TIMOCOM: "TimoCom",
};

export function formatProviderLabel(code: string): string {
  return PROVIDER_LABELS[code] ?? code.replace(/_/g, " ");
}
