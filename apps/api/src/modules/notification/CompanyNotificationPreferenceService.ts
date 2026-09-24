import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { CompanyNotificationPreferenceEntity } from "../../infrastructure/database/entities/CompanyNotificationPreferenceEntity";
import { CompanyMembershipEntity } from "../../infrastructure/database/entities/CompanyMembershipEntity";
import { UserAccountEntity } from "../../infrastructure/database/entities/UserAccountEntity";
@Injectable()
export class CompanyNotificationPreferenceService {
  public constructor(
    @InjectRepository(CompanyNotificationPreferenceEntity)
    private readonly preferenceRepository: Repository<CompanyNotificationPreferenceEntity>,
    @InjectRepository(CompanyMembershipEntity)
    private readonly membershipRepository: Repository<CompanyMembershipEntity>,
    @InjectRepository(UserAccountEntity)
    private readonly userRepository: Repository<UserAccountEntity>,
  ) {}

  public async getCompanyPreference(companyId: string) {
    const row = await this.preferenceRepository.findOne({
      where: { companyId },
    });
    return (
      row ??
      this.preferenceRepository.create({
        companyId,
        emailOpsEnabled: true,
        extraRecipientEmails: [],
      })
    );
  }

  public async updateCompanyPreference(
    companyId: string,
    patch: Partial<{
      emailOpsEnabled: boolean;
      extraRecipientEmails: string[];
    }>,
  ): Promise<CompanyNotificationPreferenceEntity> {
    const row = await this.getCompanyPreference(companyId);
    if (!row.companyId) {
      row.companyId = companyId;
    }
    Object.assign(row, patch);
    return this.preferenceRepository.save(row);
  }

  public async resolveCompanyRecipientEmails(
    companyId: string,
  ): Promise<string[]> {
    const pref = await this.getCompanyPreference(companyId);
    if (!pref.emailOpsEnabled) {
      return [];
    }
    const memberships = await this.membershipRepository.find({
      where: { companyId },
    });
    const userIds = memberships.map((row) => row.userId);
    const users =
      userIds.length > 0
        ? await this.userRepository.find({ where: { id: In(userIds) } })
        : [];
    const emails = new Set<string>();
    for (const user of users) {
      emails.add(user.emailAddress.toLowerCase());
    }
    for (const extra of pref.extraRecipientEmails ?? []) {
      if (extra.trim()) {
        emails.add(extra.trim().toLowerCase());
      }
    }
    return [...emails];
  }
}
