import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { ValidationException } from "@nakliyeborsasi/core";
import {
  EmailMarketingSegmentDefinition,
  EmailMarketingSegmentEntity,
} from "../../infrastructure/database/entities/EmailMarketingSegmentEntity";
import { UserAccountEntity } from "../../infrastructure/database/entities/UserAccountEntity";
import { CompanyMembershipEntity } from "../../infrastructure/database/entities/CompanyMembershipEntity";
import { CompanySubscriptionEntity } from "../../infrastructure/database/entities/CompanySubscriptionEntity";
import { CompanyEntity } from "../../infrastructure/database/entities/CompanyEntity";
import { CompanyRoleCode } from "@nakliyeborsasi/core";

export type MarketingRecipient = {
  email: string;
  userId: string | null;
  companyId: string | null;
};

@Injectable()
export class EmailMarketingAudienceService {
  public constructor(
    @InjectRepository(EmailMarketingSegmentEntity)
    private readonly segmentRepository: Repository<EmailMarketingSegmentEntity>,
    @InjectRepository(UserAccountEntity)
    private readonly userRepository: Repository<UserAccountEntity>,
    @InjectRepository(CompanyMembershipEntity)
    private readonly membershipRepository: Repository<CompanyMembershipEntity>,
    @InjectRepository(CompanySubscriptionEntity)
    private readonly subscriptionRepository: Repository<CompanySubscriptionEntity>,
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,
  ) {}

  public async resolveSegmentRecipients(
    segment: EmailMarketingSegmentEntity,
  ): Promise<MarketingRecipient[]> {
    return this.resolveDefinition(segment.definition);
  }

  public async previewSegment(segmentId: string): Promise<{
    count: number;
    sample: string[];
  }> {
    const segment = await this.segmentRepository.findOne({
      where: { id: segmentId },
    });
    if (!segment) {
      throw new ValidationException("Segment bulunamadı");
    }
    const recipients = await this.resolveDefinition(segment.definition);
    return {
      count: recipients.length,
      sample: recipients.slice(0, 8).map((row) => row.email),
    };
  }

  private async resolveDefinition(
    definition: EmailMarketingSegmentDefinition,
  ): Promise<MarketingRecipient[]> {
    if (definition.type === "manual") {
      const emails = [...new Set(definition.emails.map((e) => e.trim().toLowerCase()))]
        .filter((e) => e.includes("@"));
      const users =
        emails.length > 0
          ? await this.userRepository.find({
              where: { emailAddress: In(emails) },
            })
          : [];
      const userByEmail = new Map(
        users.map((u) => [u.emailAddress.toLowerCase(), u]),
      );
      return emails.map((email) => {
        const user = userByEmail.get(email);
        return {
          email,
          userId: user?.id ?? null,
          companyId: null,
        };
      });
    }
    if (definition.type === "subscription_plan") {
      const planCodes = definition.planCodes.filter(Boolean);
      if (planCodes.length === 0) {
        return [];
      }
      const subs = await this.subscriptionRepository.find({
        where: { planCode: In(planCodes), isActive: true },
      });
      const companyIds = [...new Set(subs.map((s) => s.companyId))];
      return this.ownersForCompanies(companyIds);
    }
    if (definition.type === "participant_type") {
      const codes = definition.participantTypeCodes.filter(Boolean);
      if (codes.length === 0) {
        return [];
      }
      const companies = await this.companyRepository.find({
        where: { participantTypeCode: In(codes) },
      });
      return this.ownersForCompanies(companies.map((c) => c.id));
    }
    return [];
  }

  private async ownersForCompanies(
    companyIds: string[],
  ): Promise<MarketingRecipient[]> {
    if (companyIds.length === 0) {
      return [];
    }
    const memberships = await this.membershipRepository.find({
      where: {
        companyId: In(companyIds),
        roleCode: CompanyRoleCode.CompanyOwner,
      },
    });
    const userIds = [...new Set(memberships.map((m) => m.userId))];
    const users =
      userIds.length > 0
        ? await this.userRepository.find({ where: { id: In(userIds) } })
        : [];
    const userById = new Map(users.map((u) => [u.id, u]));
    const companyByUser = new Map(
      memberships.map((m) => [m.userId, m.companyId]),
    );
    const seen = new Set<string>();
    const out: MarketingRecipient[] = [];
    for (const userId of userIds) {
      const user = userById.get(userId);
      if (!user) {
        continue;
      }
      const email = user.emailAddress.toLowerCase();
      if (seen.has(email)) {
        continue;
      }
      seen.add(email);
      out.push({
        email,
        userId: user.id,
        companyId: companyByUser.get(userId) ?? null,
      });
    }
    return out;
  }
}
