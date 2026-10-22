import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  AuthenticatedUserContext,
  AuthenticationException,
  CompanyParticipantTypeCode,
  CompanyRoleCode,
  ValidationException,
} from "@nakliyeborsasi/core";
import { UserAccountEntity } from "../../infrastructure/database/entities/UserAccountEntity";
import { CompanyEntity } from "../../infrastructure/database/entities/CompanyEntity";
import { CompanyMembershipEntity } from "../../infrastructure/database/entities/CompanyMembershipEntity";
import { MailMailboxEntity } from "../../infrastructure/database/entities/MailMailboxEntity";
import { CompanySubscriptionEntity } from "../../infrastructure/database/entities/CompanySubscriptionEntity";
import { PasswordHashingService } from "./PasswordHashingService";
import { RegisterCompanyUserRequestDto } from "./RegisterCompanyUserRequestDto";
import { LoginUserRequestDto } from "./LoginUserRequestDto";
import { SubscriptionPlanCatalog } from "../subscription/SubscriptionPlanCatalog";

@Injectable()
export class UserCredentialAuthenticationService {
  public constructor(
    @InjectRepository(UserAccountEntity)
    private readonly userAccountRepository: Repository<UserAccountEntity>,
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,
    @InjectRepository(CompanyMembershipEntity)
    private readonly companyMembershipRepository: Repository<CompanyMembershipEntity>,
    @InjectRepository(CompanySubscriptionEntity)
    private readonly companySubscriptionRepository: Repository<CompanySubscriptionEntity>,
    @InjectRepository(MailMailboxEntity)
    private readonly mailMailboxRepository: Repository<MailMailboxEntity>,
    private readonly passwordHashingService: PasswordHashingService,
    private readonly subscriptionPlanCatalog: SubscriptionPlanCatalog,
  ) {}

  public async registerCompanyOwner(
    payload: RegisterCompanyUserRequestDto,
  ): Promise<AuthenticatedUserContext> {
    const existing = await this.userAccountRepository.findOne({
      where: { emailAddress: payload.emailAddress.toLowerCase() },
    });
    if (existing) {
      throw new ValidationException("Email address is already registered");
    }
    const websiteUrl = this.normalizeWebsiteUrl(payload.companyWebsiteUrl);
    const company = await this.companyRepository.save(
      this.companyRepository.create({
        legalName: payload.companyLegalName,
        countryCode: payload.companyCountryCode.toUpperCase(),
        participantTypeCode: payload.companyParticipantTypeCode,
        websiteUrl,
      }),
    );
    const passwordHash = await this.passwordHashingService.hashPassword(
      payload.password,
    );
    const user = await this.userAccountRepository.save(
      this.userAccountRepository.create({
        emailAddress: payload.emailAddress.toLowerCase(),
        passwordHash,
        displayName: payload.displayName,
      }),
    );
    await this.companyMembershipRepository.save(
      this.companyMembershipRepository.create({
        companyId: company.id,
        userId: user.id,
        roleCode: CompanyRoleCode.CompanyOwner,
      }),
    );
    const planCode =
      payload.subscriptionPlanCode?.trim() || "carrier_starter_tr_ua";
    if (!this.subscriptionPlanCatalog.findPlanByCode(planCode)) {
      throw new ValidationException("Unknown subscription plan");
    }
    await this.companySubscriptionRepository.save(
      this.companySubscriptionRepository.create({
        companyId: company.id,
        planCode,
        isActive: true,
      }),
    );
    return new AuthenticatedUserContext({
      userId: user.id,
      companyId: company.id,
      emailAddress: user.emailAddress,
      roleCodes: [CompanyRoleCode.CompanyOwner],
      companyParticipantTypeCode: payload.companyParticipantTypeCode,
    });
  }

  public async resolveSessionContext(
    base: AuthenticatedUserContext,
  ): Promise<AuthenticatedUserContext> {
    const company = await this.companyRepository.findOne({
      where: { id: base.companyId },
    });
    const participantCode = company?.participantTypeCode as
      | CompanyParticipantTypeCode
      | null
      | undefined;
    return new AuthenticatedUserContext({
      userId: base.userId,
      companyId: base.companyId,
      emailAddress: base.emailAddress,
      roleCodes: base.roleCodes,
      companyParticipantTypeCode: participantCode ?? null,
      companyWebsiteUrl: company?.websiteUrl ?? null,
    });
  }

  public async authenticateCredentials(
    payload: LoginUserRequestDto,
  ): Promise<AuthenticatedUserContext> {
    const user = await this.userAccountRepository.findOne({
      where: { emailAddress: payload.emailAddress.toLowerCase() },
      relations: { memberships: true },
    });
    if (!user) {
      throw new AuthenticationException("Invalid email or password");
    }
    const passwordValid = await this.passwordHashingService.verifyPassword(
      payload.password,
      user.passwordHash,
    );
    if (!passwordValid) {
      throw new AuthenticationException("Invalid email or password");
    }
    const primaryMembership = await this.pickPrimaryMembership(
      user.memberships,
      user.emailAddress,
    );
    if (!primaryMembership) {
      throw new AuthenticationException("User has no company membership");
    }
    const roleCodes = user.memberships
      .filter(
        (membership) => membership.companyId === primaryMembership.companyId,
      )
      .map((membership) => membership.roleCode as CompanyRoleCode);
    const context = new AuthenticatedUserContext({
      userId: user.id,
      companyId: primaryMembership.companyId,
      emailAddress: user.emailAddress,
      roleCodes,
    });
    return this.resolveSessionContext(context);
  }

  public async resolveAuthenticatedUserById(
    userId: string,
  ): Promise<AuthenticatedUserContext> {
    const user = await this.userAccountRepository.findOne({
      where: { id: userId },
      relations: { memberships: true },
    });
    if (!user || user.memberships.length === 0) {
      throw new AuthenticationException("User has no company membership");
    }
    const primaryMembership = await this.pickPrimaryMembership(
      user.memberships,
      user.emailAddress,
    );
    const roleCodes = user.memberships
      .filter(
        (membership) => membership.companyId === primaryMembership.companyId,
      )
      .map((membership) => membership.roleCode as CompanyRoleCode);
    const context = new AuthenticatedUserContext({
      userId: user.id,
      companyId: primaryMembership.companyId,
      emailAddress: user.emailAddress,
      roleCodes,
    });
    return this.resolveSessionContext(context);
  }

  /** Posta kutusu olan organizasyonu JWT companyId olarak seç (kişi/takvim ile gelen kutusu aynı org). */
  private async pickPrimaryMembership(
    memberships: CompanyMembershipEntity[],
    emailAddress: string,
  ): Promise<CompanyMembershipEntity> {
    if (memberships.length === 0) {
      throw new AuthenticationException("User has no company membership");
    }
    const orgIds = memberships.map((m) => m.companyId);
    const mailboxByEmail = await this.mailMailboxRepository.findOne({
      where: { emailAddress: emailAddress.toLowerCase() },
    });
    if (
      mailboxByEmail &&
      orgIds.includes(mailboxByEmail.organizationId)
    ) {
      const match = memberships.find(
        (m) => m.companyId === mailboxByEmail.organizationId,
      );
      if (match) {
        return match;
      }
    }
    for (const membership of memberships) {
      const mailboxCount = await this.mailMailboxRepository.count({
        where: { organizationId: membership.companyId },
      });
      if (mailboxCount > 0) {
        return membership;
      }
    }
    return memberships[0];
  }

  private normalizeWebsiteUrl(raw?: string): string | null {
    const trimmed = raw?.trim();
    if (!trimmed) {
      return null;
    }
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return withScheme.slice(0, 255);
  }
}
