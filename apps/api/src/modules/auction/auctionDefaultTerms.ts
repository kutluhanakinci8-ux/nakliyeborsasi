import { FreightPaymentFormCode } from "@nakliyeborsasi/core";
import { FreightListingEntity } from "../../infrastructure/database/entities/FreightListingEntity";

export function buildDefaultAuctionTermsSummary(
  listing: FreightListingEntity,
): string {
  const from = listing.originPlaceName
    ? `${listing.originPlaceName} (${listing.originCityName})`
    : listing.originCityName;
  const to = listing.destinationPlaceName
    ? `${listing.destinationPlaceName} (${listing.destinationCityName})`
    : listing.destinationCityName;
  return [
    `${from} → ${to} koridor taşıması.`,
    `Araç tipi: ${listing.equipmentTypeCode}, yaklaşık ${listing.weightTonnes} t.`,
    "Yükleme/boşaltma saatleri taraflarca teyit edilir; gecikme platform kayıtlarına işlenir.",
    "CMR ve gümrük evrakları taşıyıcı sorumluluğunda; hasar/eksiklik tutanağı zorunlu.",
    "Ödeme koşulları ihale kartında belirtilen forma tabidir.",
  ].join(" ");
}

export function defaultPaymentFormCode(): string {
  return FreightPaymentFormCode.BankTransfer;
}

export function defaultPaymentDeferDays(): number {
  return 14;
}
