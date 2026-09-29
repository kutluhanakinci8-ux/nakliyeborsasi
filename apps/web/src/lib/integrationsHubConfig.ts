import { formatProviderLabel } from "./IntegrationTypes";

export type CorridorPreset = {
  id: string;
  label: string;
  origin: string;
  destination: string;
};

export const INTEGRATION_CORRIDOR_PRESETS: CorridorPreset[] = [
  { id: "tr-ua", label: "TR → UA", origin: "TR", destination: "UA" },
  { id: "tr-de", label: "TR → DE", origin: "TR", destination: "DE" },
  { id: "tr-pl", label: "TR → PL", origin: "TR", destination: "PL" },
  { id: "tr-ro", label: "TR → RO", origin: "TR", destination: "RO" },
];

export const FREIGHT_PROVIDER_CODES = [
  "LARDI_TRANS",
  "DELLA",
  "DAT",
  "TRUCKSTOP",
] as const;

export type FreightProviderCode = (typeof FREIGHT_PROVIDER_CODES)[number];

export function freightProviderMeta(code: FreightProviderCode): {
  code: FreightProviderCode;
  label: string;
  blurb: string;
} {
  const label = formatProviderLabel(code);
  const blurbs: Record<FreightProviderCode, string> = {
    LARDI_TRANS: "Doğu Avrupa ve Türkiye çıkışlı yük havuzu",
    DELLA: "Koridor ve ekipman normalize teklif akışı",
    DAT: "Kuzey Amerika spot ve kontrat referansı",
    TRUCKSTOP: "Açık yük panosu entegrasyonu",
  };
  return { code, label, blurb: blurbs[code] };
}
