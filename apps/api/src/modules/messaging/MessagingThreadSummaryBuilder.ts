import { MessagingThreadSummary } from "@nakliyeborsasi/core";
import { FreightListingEntity } from "../../infrastructure/database/entities/FreightListingEntity";
import { MessageEntity } from "../../infrastructure/database/entities/MessageEntity";

export function buildStructuredThreadSummary(params: {
  messages: MessageEntity[];
  listing: FreightListingEntity | null;
  counterpartyLegalName: string | null;
}): MessagingThreadSummary {
  const bullets: string[] = [];
  let headline = params.counterpartyLegalName
    ? `${params.counterpartyLegalName} ile firma sohbeti`
    : "Firma sohbeti";

  if (params.listing) {
    headline = `${params.listing.originCityName} → ${params.listing.destinationCityName} · ${headline}`;
    bullets.push(
      `İlan: ${params.listing.originCityName} (${params.listing.originCountryCode}) → ${params.listing.destinationCityName} (${params.listing.destinationCountryCode})`,
    );
    bullets.push(
      `Ekipman ${params.listing.equipmentTypeCode}, ${params.listing.weightTonnes} ton, yükleme ${params.listing.loadingDateStart}`,
    );
    if (params.listing.priceAmount && params.listing.priceCurrencyCode) {
      bullets.push(
        `İlan fiyatı: ${params.listing.priceAmount} ${params.listing.priceCurrencyCode}`,
      );
    }
  }

  bullets.push(`Toplam ${params.messages.length} mesaj.`);

  const recent = params.messages.slice(-12);
  const pricePattern =
    /\d[\d.,]*\s*(?:EUR|USD|TRY|TL|€|\$|eur|usd|try)/gi;
  const priceHits = recent.flatMap((row) => row.bodyText.match(pricePattern) ?? []);
  if (priceHits.length > 0) {
    bullets.push(
      `Son mesajlardaki fiyat/teklif ifadeleri: ${priceHits.slice(-4).join(", ")}`,
    );
  }

  const lastInbound = [...params.messages]
    .reverse()
    .find((row) => row.bodyText.trim().length > 0);
  if (lastInbound) {
    const preview = lastInbound.bodyText.trim().replace(/\s+/g, " ").slice(0, 160);
    bullets.push(`Son mesaj: «${preview}${lastInbound.bodyText.length > 160 ? "…" : ""}»`);
  }

  return new MessagingThreadSummary({
    headline,
    bullets,
    messageCount: params.messages.length,
    generatedAt: new Date().toISOString(),
  });
}
