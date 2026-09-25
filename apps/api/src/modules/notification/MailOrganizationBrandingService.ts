import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailOrganizationBrandingEntity } from "../../infrastructure/database/entities/MailOrganizationBrandingEntity";
import { MailSenderIdentityEntity } from "../../infrastructure/database/entities/MailSenderIdentityEntity";
import { SubscriptionPlanDisplayCatalog } from "../subscription/SubscriptionPlanDisplayCatalog";
import { MailSaasSubscriptionService } from "./MailSaasSubscriptionService";
import {
  applyEnterpriseWhiteLabelToHtml,
  appendTenantTrustFooter,
  type TenantTrustFooterMode,
} from "./MailTenantEmailBranding";

export type MailOrganizationBrandingSnapshot = {
  allowed: boolean;
  planCode: string | null;
  logoUrl: string | null;
  emailBrandTitle: string | null;
  defaultFromDisplayName: string | null;
  hidePlatformEmailChrome: boolean;
  detailTr: string;
};

export type UpdateMailOrganizationBrandingInput = {
  logoUrl?: string | null;
  emailBrandTitle?: string | null;
  defaultFromDisplayName?: string | null;
  hidePlatformEmailChrome?: boolean;
};

@Injectable()
export class MailOrganizationBrandingService {
  public constructor(
    @InjectRepository(MailOrganizationBrandingEntity)
    private readonly brandingRepository: Repository<MailOrganizationBrandingEntity>,
    @InjectRepository(MailSenderIdentityEntity)
    private readonly senderRepository: Repository<MailSenderIdentityEntity>,
    private readonly mailSaasSubscriptionService: MailSaasSubscriptionService,
    private readonly configService: ConfigService,
  ) {}

  public async getSnapshot(
    organizationId: string,
  ): Promise<MailOrganizationBrandingSnapshot> {
    const plan = await this.mailSaasSubscriptionService.getOrganizationMailPlan(
      organizationId,
    );
    const allowed = this.isWhiteLabelAllowedForPlanCode(plan.planCode);
    const row = await this.brandingRepository.findOne({
      where: { organizationId },
    });
    return {
      allowed,
      planCode: plan.planCode,
      logoUrl: row?.logoUrl ?? null,
      emailBrandTitle: row?.emailBrandTitle ?? null,
      defaultFromDisplayName: row?.defaultFromDisplayName ?? null,
      hidePlatformEmailChrome: row?.hidePlatformEmailChrome ?? false,
      detailTr: allowed
        ? "Enterprise white-label: logo ve From adı yapılandırılabilir."
        : "White-label yalnızca Enterprise mail planında (lerta_mail_enterprise_tr).",
    };
  }

  public isWhiteLabelAllowedForPlanCode(planCode: string | null): boolean {
    if (!planCode) {
      return false;
    }
    const display = SubscriptionPlanDisplayCatalog.find(planCode);
    if (display?.mailWhiteLabelAllowed) {
      return true;
    }
    const extra = this.configService
      .get<string>("MAIL_WHITELABEL_EXTRA_PLAN_CODES")
      ?.split(/[,;]/)
      .map((code) => code.trim())
      .filter(Boolean);
    return extra?.includes(planCode) ?? false;
  }

  public async assertCanManage(organizationId: string): Promise<void> {
    const snapshot = await this.getSnapshot(organizationId);
    if (!snapshot.allowed) {
      throw new ForbiddenException(snapshot.detailTr);
    }
  }

  public async updateBranding(
    organizationId: string,
    input: UpdateMailOrganizationBrandingInput,
  ): Promise<MailOrganizationBrandingSnapshot> {
    await this.assertCanManage(organizationId);
    let row = await this.brandingRepository.findOne({
      where: { organizationId },
    });
    if (!row) {
      row = this.brandingRepository.create({ organizationId });
    }
    if (input.logoUrl !== undefined) {
      row.logoUrl = this.normalizeLogoUrl(input.logoUrl);
    }
    if (input.emailBrandTitle !== undefined) {
      row.emailBrandTitle = this.normalizeShortText(input.emailBrandTitle);
    }
    if (input.defaultFromDisplayName !== undefined) {
      row.defaultFromDisplayName = this.normalizeShortText(
        input.defaultFromDisplayName,
      );
      await this.syncDefaultSenderDisplayName(
        organizationId,
        row.defaultFromDisplayName,
      );
    }
    if (input.hidePlatformEmailChrome !== undefined) {
      row.hidePlatformEmailChrome = Boolean(input.hidePlatformEmailChrome);
    }
    await this.brandingRepository.save(row);
    return this.getSnapshot(organizationId);
  }

  public async resolveDefaultFromDisplayName(
    organizationId: string,
  ): Promise<string | null> {
    if (!this.isWhiteLabelAllowedForPlanCode(
      (await this.mailSaasSubscriptionService.getOrganizationMailPlan(
        organizationId,
      )).planCode,
    )) {
      return null;
    }
    const row = await this.brandingRepository.findOne({
      where: { organizationId },
    });
    return row?.defaultFromDisplayName?.trim() || null;
  }

  public async applyToTransactionalHtml(
    organizationId: string,
    html: string,
    organizationName: string,
  ): Promise<string> {
    const plan = await this.mailSaasSubscriptionService.getOrganizationMailPlan(
      organizationId,
    );
    if (!this.isWhiteLabelAllowedForPlanCode(plan.planCode)) {
      return html;
    }
    const row = await this.brandingRepository.findOne({
      where: { organizationId },
    });
    if (!row) {
      return html;
    }
    const hasChrome =
      Boolean(row.logoUrl?.trim()) ||
      Boolean(row.emailBrandTitle?.trim()) ||
      row.hidePlatformEmailChrome;
    if (!hasChrome) {
      return html;
    }
    return applyEnterpriseWhiteLabelToHtml(html, {
      logoUrl: row.logoUrl,
      brandTitle: row.emailBrandTitle?.trim() || organizationName,
      hidePlatformEmailChrome: row.hidePlatformEmailChrome,
    });
  }

  public async resolveTrustFooterModeForOrg(
    organizationId: string,
  ): Promise<TenantTrustFooterMode> {
    const plan = await this.mailSaasSubscriptionService.getOrganizationMailPlan(
      organizationId,
    );
    if (!this.isWhiteLabelAllowedForPlanCode(plan.planCode)) {
      return "platform";
    }
    const row = await this.brandingRepository.findOne({
      where: { organizationId },
    });
    if (row?.hidePlatformEmailChrome) {
      return "minimal";
    }
    return "platform";
  }

  public async wrapTransactionalBodies(
    organizationId: string,
    html: string,
    params: { organizationName: string; fromAddress: string },
  ): Promise<string> {
    let next = await this.applyToTransactionalHtml(
      organizationId,
      html,
      params.organizationName,
    );
    const mode = await this.resolveTrustFooterModeForOrg(organizationId);
    next = appendTenantTrustFooter(next, {
      organizationName: params.organizationName,
      fromAddress: params.fromAddress,
      mode,
    });
    return next;
  }

  private async syncDefaultSenderDisplayName(
    organizationId: string,
    displayName: string | null,
  ): Promise<void> {
    if (!displayName?.trim()) {
      return;
    }
    const sender = await this.senderRepository.findOne({
      where: { organizationId, isDefault: true },
    });
    if (!sender) {
      return;
    }
    sender.displayName = displayName.trim().slice(0, 120);
    await this.senderRepository.save(sender);
  }

  private normalizeShortText(value: string | null): string | null {
    if (value === null) {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    return trimmed.slice(0, 120);
  }

  private normalizeLogoUrl(value: string | null): string | null {
    if (value === null) {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    if (trimmed.length > 2048) {
      throw new BadRequestException("Logo URL çok uzun.");
    }
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      throw new BadRequestException("Geçersiz logo URL.");
    }
    const allowHttp =
      this.configService.get<string>("MAIL_WHITELABEL_ALLOW_HTTP") === "true";
    if (parsed.protocol !== "https:" && !(allowHttp && parsed.protocol === "http:")) {
      throw new BadRequestException("Logo URL https olmalıdır.");
    }
    return parsed.toString();
  }
}
