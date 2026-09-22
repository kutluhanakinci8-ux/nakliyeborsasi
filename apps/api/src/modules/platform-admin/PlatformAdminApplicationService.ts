import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CompanyEntity } from "../../infrastructure/database/entities/CompanyEntity";
import { UserAccountEntity } from "../../infrastructure/database/entities/UserAccountEntity";
import { CompanyMembershipEntity } from "../../infrastructure/database/entities/CompanyMembershipEntity";
import { CompanySubscriptionEntity } from "../../infrastructure/database/entities/CompanySubscriptionEntity";
import { FreightListingEntity } from "../../infrastructure/database/entities/FreightListingEntity";
import { AuctionSessionEntity } from "../../infrastructure/database/entities/AuctionSessionEntity";
import { CompanyTrustReviewEntity } from "../../infrastructure/database/entities/CompanyTrustReviewEntity";
import { MessageThreadEntity } from "../../infrastructure/database/entities/MessageThreadEntity";
import { AuditLogEntity } from "../../infrastructure/database/entities/AuditLogEntity";
import { SubscriptionPlanCatalog } from "../subscription/SubscriptionPlanCatalog";

@Injectable()
export class PlatformAdminApplicationService {
  public constructor(
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,
    @InjectRepository(UserAccountEntity)
    private readonly userAccountRepository: Repository<UserAccountEntity>,
    @InjectRepository(CompanyMembershipEntity)
    private readonly membershipRepository: Repository<CompanyMembershipEntity>,
    @InjectRepository(CompanySubscriptionEntity)
    private readonly subscriptionRepository: Repository<CompanySubscriptionEntity>,
    @InjectRepository(FreightListingEntity)
    private readonly listingRepository: Repository<FreightListingEntity>,
    @InjectRepository(AuctionSessionEntity)
    private readonly auctionRepository: Repository<AuctionSessionEntity>,
    @InjectRepository(CompanyTrustReviewEntity)
    private readonly trustRepository: Repository<CompanyTrustReviewEntity>,
    @InjectRepository(MessageThreadEntity)
    private readonly threadRepository: Repository<MessageThreadEntity>,
    @InjectRepository(AuditLogEntity)
    private readonly auditRepository: Repository<AuditLogEntity>,
    private readonly subscriptionPlanCatalog: SubscriptionPlanCatalog,
  ) {}

  public async getOverview(): Promise<{
    companies: number;
    users: number;
    listings: number;
    auctions: number;
    openAuctions: number;
    subscriptions: number;
    trustReviews: number;
    messageThreads: number;
    auditLogs: number;
    participantBreakdown: {
      loadShipper: number;
      loadCarrier: number;
      loadSeeker: number;
      other: number;
    };
    operationsIndex: {
      listings: number;
      auctions: number;
      messageThreads: number;
      trustReviews: number;
      auditLogs: number;
    };
  }> {
    const [
      companies,
      users,
      listings,
      auctions,
      openAuctions,
      subscriptions,
      trustReviews,
      messageThreads,
      auditLogs,
      allCompanies,
    ] = await Promise.all([
      this.companyRepository.count(),
      this.userAccountRepository.count(),
      this.listingRepository.count(),
      this.auctionRepository.count(),
      this.auctionRepository.count({ where: { statusCode: "OPEN" } }),
      this.subscriptionRepository.count({ where: { isActive: true } }),
      this.trustRepository.count(),
      this.threadRepository.count(),
      this.auditRepository.count(),
      this.companyRepository.find(),
    ]);

    let loadShipper = 0;
    let loadCarrier = 0;
    let loadSeeker = 0;
    let other = 0;
    for (const company of allCompanies) {
      switch (company.participantTypeCode) {
        case "LOAD_SHIPPER":
          loadShipper++;
          break;
        case "LOAD_CARRIER":
          loadCarrier++;
          break;
        case "LOAD_SEEKER":
          loadSeeker++;
          break;
        default:
          other++;
      }
    }

    const maxOp = Math.max(listings, auctions, messageThreads, trustReviews, 1);

    return {
      companies,
      users,
      listings,
      auctions,
      openAuctions,
      subscriptions,
      trustReviews,
      messageThreads,
      auditLogs,
      participantBreakdown: {
        loadShipper,
        loadCarrier,
        loadSeeker,
        other,
      },
      operationsIndex: {
        listings: Math.round((listings / maxOp) * 100),
        auctions: Math.round((auctions / maxOp) * 100),
        messageThreads: Math.round((messageThreads / maxOp) * 100),
        trustReviews: Math.round((trustReviews / maxOp) * 100),
        auditLogs: Math.min(100, Math.round((auditLogs / 250) * 100)),
      },
    };
  }

  public async listCompanies(): Promise<
    {
      id: string;
      legalName: string;
      countryCode: string;
      participantTypeCode: string | null;
      userCount: number;
      listingCount: number;
      activePlanCode: string | null;
    }[]
  > {
    const companies = await this.companyRepository.find({
      order: { legalName: "ASC" },
    });
    const memberships = await this.membershipRepository.find();
    const listings = await this.listingRepository.find();
    const subs = await this.subscriptionRepository.find({ where: { isActive: true } });

    const usersByCompany = new Map<string, number>();
    for (const m of memberships) {
      usersByCompany.set(m.companyId, (usersByCompany.get(m.companyId) ?? 0) + 1);
    }
    const listingsByCompany = new Map<string, number>();
    for (const l of listings) {
      listingsByCompany.set(
        l.ownerCompanyId,
        (listingsByCompany.get(l.ownerCompanyId) ?? 0) + 1,
      );
    }
    const planByCompany = new Map<string, string>();
    for (const s of subs) {
      planByCompany.set(s.companyId, s.planCode);
    }

    return companies.map((c) => ({
      id: c.id,
      legalName: c.legalName,
      countryCode: c.countryCode,
      participantTypeCode: c.participantTypeCode,
      userCount: usersByCompany.get(c.id) ?? 0,
      listingCount: listingsByCompany.get(c.id) ?? 0,
      activePlanCode: planByCompany.get(c.id) ?? null,
    }));
  }

  public async listUsers(): Promise<
    {
      id: string;
      emailAddress: string;
      displayName: string;
      companyId: string;
      companyLegalName: string;
      participantTypeCode: string | null;
      roleCodes: string[];
    }[]
  > {
    const users = await this.userAccountRepository.find({
      relations: { memberships: true },
      order: { emailAddress: "ASC" },
    });
    const companies = await this.companyRepository.find();
    const companyMap = new Map(companies.map((c) => [c.id, c]));

    return users.flatMap((user) => {
      if (user.memberships.length === 0) {
        return [
          {
            id: user.id,
            emailAddress: user.emailAddress,
            displayName: user.displayName,
            companyId: "",
            companyLegalName: "—",
            participantTypeCode: null,
            roleCodes: [] as string[],
          },
        ];
      }
      return user.memberships.map((m) => {
        const company = companyMap.get(m.companyId);
        return {
          id: user.id,
          emailAddress: user.emailAddress,
          displayName: user.displayName,
          companyId: m.companyId,
          companyLegalName: company?.legalName ?? m.companyId.slice(0, 8),
          participantTypeCode: company?.participantTypeCode ?? null,
          roleCodes: [m.roleCode],
        };
      });
    });
  }

  public async listListings(): Promise<
    {
      id: string;
      ownerCompanyId: string;
      ownerLegalName: string;
      originCityName: string;
      destinationCityName: string;
      equipmentTypeCode: string;
      priceAmount: string | null;
      priceCurrencyCode: string | null;
      loadingDateStart: string;
    }[]
  > {
    const listings = await this.listingRepository.find({
      order: { createdAt: "DESC" },
    });
    const companies = await this.companyRepository.find();
    const companyMap = new Map(companies.map((c) => [c.id, c.legalName]));

    return listings.map((l) => ({
      id: l.id,
      ownerCompanyId: l.ownerCompanyId,
      ownerLegalName: companyMap.get(l.ownerCompanyId) ?? l.ownerCompanyId.slice(0, 8),
      originCityName: l.originCityName,
      destinationCityName: l.destinationCityName,
      equipmentTypeCode: l.equipmentTypeCode,
      priceAmount: l.priceAmount,
      priceCurrencyCode: l.priceCurrencyCode,
      loadingDateStart: l.loadingDateStart,
    }));
  }

  public async listAuctions(): Promise<
    {
      id: string;
      statusCode: string;
      ownerCompanyId: string;
      freightListingId: string;
      minimumBidAmount: string;
      currencyCode: string;
      endsAt: string;
      bidCount: number;
    }[]
  > {
    const sessions = await this.auctionRepository.find({
      relations: { bids: true },
      order: { createdAt: "DESC" },
    });
    return sessions.map((s) => ({
      id: s.id,
      statusCode: s.statusCode,
      ownerCompanyId: s.ownerCompanyId,
      freightListingId: s.freightListingId,
      minimumBidAmount: s.minimumBidAmount,
      currencyCode: s.currencyCode,
      endsAt: s.endsAt.toISOString(),
      bidCount: s.bids?.length ?? 0,
    }));
  }

  public async listSubscriptions(): Promise<
    {
      id: string;
      companyId: string;
      companyLegalName: string;
      planCode: string;
      isActive: boolean;
      createdAt: string;
    }[]
  > {
    const subs = await this.subscriptionRepository.find({
      order: { createdAt: "DESC" },
    });
    const companies = await this.companyRepository.find();
    const companyMap = new Map(companies.map((c) => [c.id, c.legalName]));

    return subs.map((s) => ({
      id: s.id,
      companyId: s.companyId,
      companyLegalName: companyMap.get(s.companyId) ?? s.companyId.slice(0, 8),
      planCode: s.planCode,
      isActive: s.isActive,
      createdAt: s.createdAt.toISOString(),
    }));
  }

  public listPlanCatalog(): ReturnType<SubscriptionPlanCatalog["listPlans"]> {
    return this.subscriptionPlanCatalog.listPlans();
  }

  public async listTrustReviews(): Promise<
    {
      id: string;
      targetCompanyId: string;
      authorCompanyId: string;
      scoreValue: number;
      commentText: string;
      createdAt: string;
    }[]
  > {
    const reviews = await this.trustRepository.find({
      order: { createdAt: "DESC" },
      take: 100,
    });
    return reviews.map((r) => ({
      id: r.id,
      targetCompanyId: r.targetCompanyId,
      authorCompanyId: r.authorCompanyId,
      scoreValue: r.scoreValue,
      commentText: r.commentText,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  public async listAuditLogs(): Promise<
    {
      id: string;
      httpMethod: string;
      requestPath: string;
      responseStatusCode: number;
      actionCode: string;
      createdAt: string;
    }[]
  > {
    const logs = await this.auditRepository.find({
      order: { createdAt: "DESC" },
      take: 50,
    });
    return logs.map((l) => ({
      id: l.id,
      httpMethod: l.httpMethod,
      requestPath: l.requestPath,
      responseStatusCode: l.responseStatusCode,
      actionCode: l.actionCode,
      createdAt: l.createdAt.toISOString(),
    }));
  }
}
