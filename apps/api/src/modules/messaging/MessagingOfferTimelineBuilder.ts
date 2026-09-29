import { MessageEntity } from "../../infrastructure/database/entities/MessageEntity";

export type MessagingOfferTimelineEntry = {
  at: string;
  kind: "message" | "listing_price" | "offer_keyword";
  label: string;
  amountText?: string;
};

const pricePattern =
  /(\d[\d.,]*)\s*(EUR|USD|TRY|TL|€|\$|eur|usd|try)/gi;

const offerKeyword =
  /\b(teklif|offer|fiyat|price|kabul|accept|red|reject|karşı)\b/i;

export function buildOfferTimeline(
  messages: MessageEntity[],
  listingPrice: { amount: string; currency: string } | null,
): MessagingOfferTimelineEntry[] {
  const entries: MessagingOfferTimelineEntry[] = [];

  const timelineAnchor =
    messages[0]?.createdAt.toISOString() ?? new Date().toISOString();

  if (listingPrice) {
    entries.push({
      at: timelineAnchor,
      kind: "listing_price",
      label: "İlan fiyatı",
      amountText: `${listingPrice.amount} ${listingPrice.currency}`,
    });
  }

  for (const message of messages) {
    const body = message.bodyText.trim();
    if (!body) {
      continue;
    }
    const prices = [...body.matchAll(pricePattern)];
    if (prices.length > 0) {
      const last = prices[prices.length - 1];
      entries.push({
        at: message.createdAt.toISOString(),
        kind: "message",
        label: "Mesajda fiyat ifadesi",
        amountText: `${last[1]} ${last[2]}`,
      });
      continue;
    }
    if (offerKeyword.test(body)) {
      entries.push({
        at: message.createdAt.toISOString(),
        kind: "offer_keyword",
        label: body.slice(0, 72).replace(/\s+/g, " "),
      });
    }
  }

  return entries
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(-24);
}
