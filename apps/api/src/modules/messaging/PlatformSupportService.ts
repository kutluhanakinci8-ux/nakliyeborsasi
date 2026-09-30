import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  PLATFORM_OWNER_COMPANY_LEGAL_NAME,
  PLATFORM_OWNER_EMAIL,
} from "@nakliyeborsasi/core";
import { UserAccountEntity } from "../../infrastructure/database/entities/UserAccountEntity";
import { CompanyMembershipEntity } from "../../infrastructure/database/entities/CompanyMembershipEntity";

@Injectable()
export class PlatformSupportService {
  public constructor(
    @InjectRepository(UserAccountEntity)
    private readonly userAccountRepository: Repository<UserAccountEntity>,
    @InjectRepository(CompanyMembershipEntity)
    private readonly companyMembershipRepository: Repository<CompanyMembershipEntity>,
  ) {}

  public async resolveSupportCounterparty(): Promise<{
    supportCompanyId: string;
    legalName: string;
  }> {
    const email = PLATFORM_OWNER_EMAIL.toLowerCase();
    const user = await this.userAccountRepository.findOne({
      where: { emailAddress: email },
    });
    if (!user) {
      throw new NotFoundException("Platform destek hesabı yapılandırılmamış");
    }
    const memberships = await this.companyMembershipRepository.find({
      where: { userId: user.id },
      order: { createdAt: "ASC" },
      take: 1,
    });
    const membership = memberships[0];
    if (!membership?.companyId) {
      throw new NotFoundException("Platform destek firması bulunamadı");
    }
    return {
      supportCompanyId: membership.companyId,
      legalName: PLATFORM_OWNER_COMPANY_LEGAL_NAME,
    };
  }
}
