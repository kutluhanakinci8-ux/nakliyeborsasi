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
import { CompanySubscriptionEntity } from "../../infrastructure/database/entities/CompanySubscriptionEntity";
import { PasswordHashingService } from "./PasswordHashingService";
import { RegisterCompanyUserRequestDto } from "./RegisterCompanyUserRequestDto";
import { LoginUserRequestDto } from "./LoginUserRequestDto";

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
    private readonly passwordHashingService: PasswordHashingService,
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
    const company = await this.companyRepository.save(
      this.companyRepository.create({
        legalName: payload.companyLegalName,
        countryCode: payload.companyCountryCode.toUpperCase(),
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
    await this.companySubscriptionRepository.save(
      this.companySubscriptionRepository.create({
        companyId: company.id,
        planCode: "carrier_starter_tr_ua",
        isActive: true,
      }),
    );
    return new AuthenticatedUserContext({
      userId: user.id,
      companyId: company.id,
      emailAddress: user.emailAddress,
      roleCodes: [CompanyRoleCode.CompanyOwner],
      companyParticipantTypeCode: null,
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
    const primaryMembership = user.memberships[0];
    if (!primaryMembership) {
      throw new AuthenticationException("User has no company membership");
    }
    const roleCodes = user.memberships.map(
      (membership) => membership.roleCode as CompanyRoleCode,
    );
    const context = new AuthenticatedUserContext({
      userId: user.id,
      companyId: primaryMembership.companyId,
      emailAddress: user.emailAddress,
      roleCodes,
    });
    return this.resolveSessionContext(context);
  }
}
