import * as bcrypt from "bcrypt";
import { Repository } from "typeorm";
import {
  CompanyRoleCode,
  PLATFORM_OWNER_BOOTSTRAP_PASSWORD,
  PLATFORM_OWNER_COMPANY_COUNTRY_CODE,
  PLATFORM_OWNER_COMPANY_LEGAL_NAME,
  PLATFORM_OWNER_DISPLAY_NAME,
  PLATFORM_OWNER_EMAIL,
  PLATFORM_OWNER_PARTICIPANT_TYPE,
  PLATFORM_OWNER_SUBSCRIPTION_PLAN_CODE,
} from "@nakliyeborsasi/core";
import { CompanyEntity } from "../entities/CompanyEntity";
import { CompanyMembershipEntity } from "../entities/CompanyMembershipEntity";
import { CompanySubscriptionEntity } from "../entities/CompanySubscriptionEntity";
import { UserAccountEntity } from "../entities/UserAccountEntity";

type PlatformOwnerSeedDeps = {
  companyRepository: Repository<CompanyEntity>;
  userAccountRepository: Repository<UserAccountEntity>;
  companyMembershipRepository: Repository<CompanyMembershipEntity>;
  companySubscriptionRepository: Repository<CompanySubscriptionEntity>;
};

function resolveBootstrapPassword(): string {
  const fromEnv = process.env.PLATFORM_OWNER_BOOTSTRAP_PASSWORD?.trim();
  return fromEnv && fromEnv.length >= 8
    ? fromEnv
    : PLATFORM_OWNER_BOOTSTRAP_PASSWORD;
}

/**
 * Tek yetkili platform sahibi hesabını oluşturur veya (henüz giriş yapılmamışsa) bootstrap şifresini uygular.
 */
export async function ensurePlatformOwnerAccount(
  deps: PlatformOwnerSeedDeps,
): Promise<void> {
  const email = PLATFORM_OWNER_EMAIL.toLowerCase();
  const bootstrapPassword = resolveBootstrapPassword();
  const passwordHash = await bcrypt.hash(bootstrapPassword, 12);

  const existingUser = await deps.userAccountRepository.findOne({
    where: { emailAddress: email },
  });

  if (!existingUser) {
    const company = await deps.companyRepository.save(
      deps.companyRepository.create({
        legalName: PLATFORM_OWNER_COMPANY_LEGAL_NAME,
        countryCode: PLATFORM_OWNER_COMPANY_COUNTRY_CODE,
        participantTypeCode: PLATFORM_OWNER_PARTICIPANT_TYPE,
      }),
    );
    const user = await deps.userAccountRepository.save(
      deps.userAccountRepository.create({
        emailAddress: email,
        passwordHash,
        displayName: PLATFORM_OWNER_DISPLAY_NAME,
        emailVerifiedAt: new Date(),
        preferredLocale: "tr",
      }),
    );
    await deps.companyMembershipRepository.save(
      deps.companyMembershipRepository.create({
        companyId: company.id,
        userId: user.id,
        roleCode: CompanyRoleCode.CompanyOwner,
      }),
    );
    await deps.companySubscriptionRepository.save(
      deps.companySubscriptionRepository.create({
        companyId: company.id,
        planCode: PLATFORM_OWNER_SUBSCRIPTION_PLAN_CODE,
        isActive: true,
      }),
    );
    return;
  }

  const loginCount = existingUser.loginCount ?? 0;
  const forceSync =
    process.env.PLATFORM_OWNER_FORCE_BOOTSTRAP_PASSWORD === "true";
  if (loginCount === 0 || forceSync) {
    existingUser.passwordHash = passwordHash;
    existingUser.displayName = PLATFORM_OWNER_DISPLAY_NAME;
    if (!existingUser.emailVerifiedAt) {
      existingUser.emailVerifiedAt = new Date();
    }
    await deps.userAccountRepository.save(existingUser);
  }

  const membership = await deps.companyMembershipRepository.findOne({
    where: { userId: existingUser.id },
  });
  if (!membership) {
    const company = await deps.companyRepository.save(
      deps.companyRepository.create({
        legalName: PLATFORM_OWNER_COMPANY_LEGAL_NAME,
        countryCode: PLATFORM_OWNER_COMPANY_COUNTRY_CODE,
        participantTypeCode: PLATFORM_OWNER_PARTICIPANT_TYPE,
      }),
    );
    await deps.companyMembershipRepository.save(
      deps.companyMembershipRepository.create({
        companyId: company.id,
        userId: existingUser.id,
        roleCode: CompanyRoleCode.CompanyOwner,
      }),
    );
    await deps.companySubscriptionRepository.save(
      deps.companySubscriptionRepository.create({
        companyId: company.id,
        planCode: PLATFORM_OWNER_SUBSCRIPTION_PLAN_CODE,
        isActive: true,
      }),
    );
    return;
  }

  const company = await deps.companyRepository.findOne({
    where: { id: membership.companyId },
  });
  if (company) {
    company.legalName = PLATFORM_OWNER_COMPANY_LEGAL_NAME;
    company.countryCode = PLATFORM_OWNER_COMPANY_COUNTRY_CODE;
    company.participantTypeCode =
      company.participantTypeCode ?? PLATFORM_OWNER_PARTICIPANT_TYPE;
    await deps.companyRepository.save(company);
  }
}
