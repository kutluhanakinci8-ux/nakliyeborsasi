import { Repository } from "typeorm";
import { FreightPaymentFormCode } from "@nakliyeborsasi/core";
import { AuctionSessionEntity } from "../entities/AuctionSessionEntity";
import { FreightListingEntity } from "../entities/FreightListingEntity";
import { buildDefaultAuctionTermsSummary } from "../../../modules/auction/auctionDefaultTerms";

/** Demo ihalelere şartname ve ödeme alanları (Faz B). */
export async function enrichAuctionTermsAndPayment(
  auctionSessionRepository: Repository<AuctionSessionEntity>,
  freightListingRepository: Repository<FreightListingEntity>,
): Promise<void> {
  const sessions = await auctionSessionRepository.find();
  for (const session of sessions) {
    if (session.termsSummary?.trim()) {
      continue;
    }
    const listing = await freightListingRepository.findOne({
      where: { id: session.freightListingId },
    });
    if (!listing) {
      continue;
    }
    session.termsSummary = buildDefaultAuctionTermsSummary(listing);
    session.paymentFormCode =
      session.paymentFormCode ?? FreightPaymentFormCode.BankTransfer;
    session.paymentDeferDays = session.paymentDeferDays ?? 14;
    session.priceIncludesVat = session.priceIncludesVat ?? false;
    session.bidStepAmount =
      session.bidStepAmount ??
      (Number(session.minimumBidAmount) >= 100
        ? "50.00"
        : "10.00");
    session.cargoDescription =
      session.cargoDescription ??
      `Koridor yükü — ${listing.equipmentTypeCode}, ${listing.weightTonnes} t`;
    session.specDocumentLabel =
      session.specDocumentLabel ?? "Taşıma şartnamesi (örnek)";
    session.specDocumentUrl =
      session.specDocumentUrl ??
      "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
    session.auctionTypeCode = session.auctionTypeCode ?? "REVERSE_OPEN";
    session.autoExtendMinutes = session.autoExtendMinutes ?? 5;
    session.autoExtendWindowMinutes = session.autoExtendWindowMinutes ?? 3;
    await auctionSessionRepository.save(session);
  }
}
