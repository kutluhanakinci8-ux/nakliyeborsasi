import { countryLabelTr, normalizeCountryCode } from "./countryDisplay";

export type FreightLocationPoint = {
  countryCode: string;
  cityName: string;
  placeName?: string | null;
  placeKindCode?: string | null;
};

type PlaceHint = {
  placeName: string;
  placeKindCode: string;
};

const ORIGIN_HINTS: Record<string, PlaceHint> = {
  "TR:İstanbul": { placeName: "MIP Ambarlı Limanı", placeKindCode: "PORT" },
  "TR:Ankara": { placeName: "Ostim Lojistik Üssü", placeKindCode: "WAREHOUSE" },
  "TR:İzmir": { placeName: "Alsancak Limanı", placeKindCode: "PORT" },
  "TR:Bursa": {
    placeName: "Bursa OSB — Teslimat kapısı",
    placeKindCode: "DELIVERY_POINT",
  },
  "UA:Kyiv": { placeName: "Kyiv Logistics Park", placeKindCode: "WAREHOUSE" },
  "UA:Odesa": { placeName: "Port of Odesa (Chornomorsk)", placeKindCode: "PORT" },
};

const DESTINATION_HINTS: Record<string, PlaceHint> = {
  "DE:Hamburg": {
    placeName: "CTB Container Terminal Hamburg",
    placeKindCode: "PORT",
  },
  "DE:Berlin": { placeName: "Berlin Westhafen", placeKindCode: "PORT" },
  "UA:Lviv": {
    placeName: "Lviv — Rava-Ruska depo bölgesi",
    placeKindCode: "WAREHOUSE",
  },
  "UA:Odesa": {
    placeName: "Odesa serbest bölge teslimat",
    placeKindCode: "DELIVERY_POINT",
  },
  "PL:Warsaw": { placeName: "Warszawa Praga DC", placeKindCode: "DELIVERY_POINT" },
  "RO:Bucharest": {
    placeName: "Bucharest Otopeni Cargo Hub",
    placeKindCode: "WAREHOUSE",
  },
  "BG:Sofia": { placeName: "Sofia Ring DC", placeKindCode: "DELIVERY_POINT" },
};

function hintKey(countryCode: string, cityName: string): string {
  return `${countryCode.trim().toUpperCase()}:${cityName.trim()}`;
}

/** API alanı boşsa demo/koridor için bilinen liman ve teslimat adlarını önerir. */
export function resolveFreightLocationPoint(
  point: FreightLocationPoint,
  role: "origin" | "destination",
): FreightLocationPoint {
  if (point.placeName?.trim()) {
    return point;
  }
  const hints = role === "origin" ? ORIGIN_HINTS : DESTINATION_HINTS;
  const hint = hints[hintKey(point.countryCode, point.cityName)];
  if (!hint) {
    return point;
  }
  return {
    ...point,
    placeName: hint.placeName,
    placeKindCode: hint.placeKindCode,
  };
}

const PLACE_KIND_LABEL_TR: Record<string, string> = {
  CITY: "Şehir",
  PORT: "Liman",
  TERMINAL: "Terminal",
  WAREHOUSE: "Depo / lojistik üssü",
  DELIVERY_POINT: "Teslimat noktası",
  CUSTOMS: "Gümrük / sınır",
};

export function freightPlaceKindLabelTr(kindCode: string | null | undefined): string {
  if (!kindCode) {
    return "Konum";
  }
  return PLACE_KIND_LABEL_TR[kindCode] ?? kindCode;
}

/** Birincil satır: liman, terminal veya teslimat adı. */
export function freightLocationPrimaryLabel(point: FreightLocationPoint): string {
  const place = point.placeName?.trim();
  if (place) {
    return place;
  }
  return point.cityName.trim();
}

/** İkincil satır: şehir + ülke (kurumsal adres satırı). */
export function freightLocationSecondaryLabel(point: FreightLocationPoint): string {
  const country = normalizeCountryCode(point.countryCode) ?? point.countryCode;
  const countryName = countryLabelTr(country);
  const city = point.cityName.trim();
  const primary = freightLocationPrimaryLabel(point);
  if (primary === city) {
    return `${city} · ${countryName} (${country})`;
  }
  return `${city} · ${countryName} (${country})`;
}

export function formatLoadingDateTr(isoDate: string): string {
  const parsed = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }
  return parsed.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
