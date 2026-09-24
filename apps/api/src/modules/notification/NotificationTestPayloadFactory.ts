import { NotificationEventCode } from "./NotificationEventCode";

const AUCTION_EVENTS = new Set<NotificationEventCode>([
  NotificationEventCode.AuctionBidPlaced,
  NotificationEventCode.AuctionOutbid,
  NotificationEventCode.AuctionWon,
  NotificationEventCode.AuctionPublished,
]);

export function buildAdminTestNotificationPayload(params: {
  eventCode: NotificationEventCode;
  organizationId: string;
  webBaseUrl: string;
}): Record<string, string> {
  const base: Record<string, string> = {
    displayName: "Lerta Logistics (test)",
    emailAddress: "admin@lerta.tr",
    companyLegalName: "Kutluhan Test Taşımacılık",
    companyCountryCode: "TR",
    participantType: "LOAD_CARRIER",
    planCode: "carrier_professional_tr_ua",
    companyId: params.organizationId,
    userId: "00000000-0000-0000-0000-000000000002",
    ipAddress: "127.0.0.1",
    userAgent: "Test/1.0",
    loginCount: "1",
    occurredAt: new Date().toISOString(),
    organizasyonUrl: `${params.webBaseUrl}/hesap/organizasyon`,
  };

  if (AUCTION_EVENTS.has(params.eventCode)) {
    return {
      ...base,
      auctionSessionId: "00000000-test-auction-session",
      bidAmount: "47.500",
      bidderCompanyName: "Demo Lojistik A.Ş.",
      auctionUrl: `${params.webBaseUrl}/auctions/00000000-test-auction-session`,
    };
  }

  return base;
}
