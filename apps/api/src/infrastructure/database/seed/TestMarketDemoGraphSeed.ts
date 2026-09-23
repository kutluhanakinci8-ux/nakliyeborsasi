import { Repository } from "typeorm";
import {
  AuctionSessionStatusCode,
  CompanyParticipantTypeCode,
} from "@nakliyeborsasi/core";
import { CompanyEntity } from "../entities/CompanyEntity";
import { UserAccountEntity } from "../entities/UserAccountEntity";
import { FreightListingEntity } from "../entities/FreightListingEntity";
import { AuctionSessionEntity } from "../entities/AuctionSessionEntity";
import { AuctionBidEntity } from "../entities/AuctionBidEntity";
import { MessageThreadEntity } from "../entities/MessageThreadEntity";
import { MessageEntity } from "../entities/MessageEntity";
import { CompanyTrustReviewEntity } from "../entities/CompanyTrustReviewEntity";

const DEMO_GRAPH_MARKER_EMAIL = "yukveren01@test.nakliyeborsasi.local";

export async function seedTestMarketDemoGraph(deps: {
  companyRepository: Repository<CompanyEntity>;
  userAccountRepository: Repository<UserAccountEntity>;
  freightListingRepository: Repository<FreightListingEntity>;
  auctionSessionRepository: Repository<AuctionSessionEntity>;
  auctionBidRepository: Repository<AuctionBidEntity>;
  messageThreadRepository: Repository<MessageThreadEntity>;
  messageRepository: Repository<MessageEntity>;
  trustReviewRepository: Repository<CompanyTrustReviewEntity>;
}): Promise<void> {
  const markerUser = await deps.userAccountRepository.findOne({
    where: { emailAddress: DEMO_GRAPH_MARKER_EMAIL },
  });
  if (!markerUser) {
    return;
  }

  const existingAuctions = await deps.auctionSessionRepository.count();
  if (existingAuctions >= 5) {
    await ensureMessagingAndTrust(deps);
    return;
  }

  const companies = await deps.companyRepository.find();
  const shippers = companies.filter(
    (c) => c.participantTypeCode === CompanyParticipantTypeCode.LoadShipper,
  );
  const carriers = companies.filter(
    (c) => c.participantTypeCode === CompanyParticipantTypeCode.LoadCarrier,
  );
  if (shippers.length === 0 || carriers.length === 0) {
    return;
  }

  const listings = await deps.freightListingRepository.find({
    order: { createdAt: "ASC" },
  });
  const shipperListings = listings.filter((l) =>
    shippers.some((s) => s.id === l.ownerCompanyId),
  );

  for (const listing of shipperListings) {
    const existing = await deps.auctionSessionRepository.findOne({
      where: { freightListingId: listing.id },
    });
    if (existing) {
      continue;
    }
    const endsAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const session = await deps.auctionSessionRepository.save(
      deps.auctionSessionRepository.create({
        freightListingId: listing.id,
        ownerCompanyId: listing.ownerCompanyId,
        statusCode: AuctionSessionStatusCode.Open,
        endsAt,
        minimumBidAmount: listing.priceAmount ?? "1500.00",
        currencyCode: listing.priceCurrencyCode ?? "EUR",
        winningBidId: null,
        auctionTypeCode: "REVERSE_OPEN",
        autoExtendMinutes: 5,
        autoExtendWindowMinutes: 3,
      }),
    );

    const carrier = carriers[shipperListings.indexOf(listing) % carriers.length];
    const bidAmount = (
      Number.parseFloat(session.minimumBidAmount) - 50
    ).toFixed(2);
    await deps.auctionBidRepository.save(
      deps.auctionBidRepository.create({
        auctionSessionId: session.id,
        bidderCompanyId: carrier.id,
        bidAmount,
      }),
    );
  }

  await ensureMessagingAndTrust(deps);
}

async function ensureMessagingAndTrust(deps: {
  companyRepository: Repository<CompanyEntity>;
  userAccountRepository: Repository<UserAccountEntity>;
  freightListingRepository: Repository<FreightListingEntity>;
  messageThreadRepository: Repository<MessageThreadEntity>;
  messageRepository: Repository<MessageEntity>;
  trustReviewRepository: Repository<CompanyTrustReviewEntity>;
}): Promise<void> {
  const threadCount = await deps.messageThreadRepository.count();
  if (threadCount < 5) {
    const companies = await deps.companyRepository.find();
    const shippers = companies.filter(
      (c) => c.participantTypeCode === CompanyParticipantTypeCode.LoadShipper,
    );
    const carriers = companies.filter(
      (c) => c.participantTypeCode === CompanyParticipantTypeCode.LoadCarrier,
    );
    const listings = await deps.freightListingRepository.find({
      order: { createdAt: "ASC" },
      take: 1,
    });
    const listing = listings[0];

    for (let i = 0; i < Math.min(5, shippers.length, carriers.length); i++) {
      const shipper = shippers[i];
      const carrier = carriers[i];
      const thread = await deps.messageThreadRepository.save(
        deps.messageThreadRepository.create({
          companyAId: shipper.id,
          companyBId: carrier.id,
          freightListingId: listing?.id ?? null,
        }),
      );
      const shipperUser = await deps.userAccountRepository
        .createQueryBuilder("u")
        .innerJoin("u.memberships", "m")
        .where("m.companyId = :companyId", { companyId: shipper.id })
        .getOne();
      const carrierUser = await deps.userAccountRepository
        .createQueryBuilder("u")
        .innerJoin("u.memberships", "m")
        .where("m.companyId = :companyId", { companyId: carrier.id })
        .getOne();
      if (shipperUser) {
        await deps.messageRepository.save(
          deps.messageRepository.create({
            threadId: thread.id,
            senderCompanyId: shipper.id,
            senderUserId: shipperUser.id,
            bodyText: `Merhaba, ${listing?.originCityName ?? "yük"} hattı için kapasitemiz uygun mu?`,
          }),
        );
      }
      if (carrierUser) {
        await deps.messageRepository.save(
          deps.messageRepository.create({
            threadId: thread.id,
            senderCompanyId: carrier.id,
            senderUserId: carrierUser.id,
            bodyText: "Evet, tarih ve tonajı paylaşırsanız teklif hazırlarız.",
          }),
        );
      }
    }
  }

  const reviewCount = await deps.trustReviewRepository.count();
  if (reviewCount < 5) {
    const companies = await deps.companyRepository.find();
    const shippers = companies.filter(
      (c) => c.participantTypeCode === CompanyParticipantTypeCode.LoadShipper,
    );
    const carriers = companies.filter(
      (c) => c.participantTypeCode === CompanyParticipantTypeCode.LoadCarrier,
    );
    for (let i = 0; i < Math.min(5, shippers.length, carriers.length); i++) {
      await deps.trustReviewRepository.save(
        deps.trustReviewRepository.create({
          targetCompanyId: shippers[i].id,
          authorCompanyId: carriers[i].id,
          scoreValue: 4 + (i % 2),
          commentText: "Test değerlendirme — zamanında teslimat, iyi iletişim.",
        }),
      );
    }
  }
}
