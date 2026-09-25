import { BadRequestException, Injectable } from "@nestjs/common";
import { randomBytes } from "crypto";
import { MailTenantSubdomainService } from "./MailTenantSubdomainService";
import { MailSaasSubscriptionService } from "./MailSaasSubscriptionService";

const PILOT_PLAN = "lerta_mail_pilot_tr";

@Injectable()
export class MailPilotOnboardingService {
  public constructor(
    private readonly mailTenantSubdomainService: MailTenantSubdomainService,
    private readonly mailSaasSubscriptionService: MailSaasSubscriptionService,
  ) {}

  public suggestLocalPart(companyLegalName: string): string {
    const normalized = companyLegalName
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    if (normalized.length >= 3) {
      return normalized;
    }
    return `kutu-${randomBytes(2).toString("hex")}`;
  }

  public async quickStart(params: {
    organizationId: string;
    companyLegalName: string;
    displayName?: string;
    localPart?: string;
  }): Promise<{
    fromAddress: string;
    localPart: string;
    tenantDomain: string;
    webmailHandoffPath: string;
  }> {
    const plan = await this.mailSaasSubscriptionService.getOrganizationMailPlan(
      params.organizationId,
    );
    if (plan.planCode !== PILOT_PLAN) {
      throw new BadRequestException(
        "Pilot hızlı başlangıç yalnızca Pilot planında kullanılabilir.",
      );
    }
    const localPart =
      params.localPart?.trim().toLowerCase() ||
      this.suggestLocalPart(params.companyLegalName);
    await this.mailSaasSubscriptionService.assertMailboxQuota(
      params.organizationId,
      1,
    );
    const result = await this.mailTenantSubdomainService.provisionPilotSender({
      organizationId: params.organizationId,
      localPart,
      displayName: params.displayName?.trim() || params.companyLegalName,
      makeDefault: true,
    });
    const tenantDomain = result.domain.domain;
    return {
      fromAddress: result.fromAddress,
      localPart,
      tenantDomain,
      webmailHandoffPath: "/auth/consume",
    };
  }
}
