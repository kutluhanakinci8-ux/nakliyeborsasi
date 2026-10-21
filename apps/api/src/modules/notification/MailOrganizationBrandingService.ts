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
import type { OutboundWrapBranding } from "./MailOutboundHtmlTemplate";
import {
  type MailEmailSocialLink,
  normalizeMailEmailSocialLinks,
} from "./MailEmailSocialLinks";

export type MailOrganizationBrandingSnapshot = {
  allowed: boolean;
  planCode: string | null;
  logoUrl: string | null;
  emailBrandTitle: string | null;
  emailAccentColor: string | null;
  emailLegalFooter: string | null;
  defaultFromDisplayName: string | null;
  hidePlatformEmailChrome: boolean;
  emailSocialLinks: MailEmailSocialLink[];
  detailTr: string;
};

export type UpdateMailOrganizationBrandingInput = {
  logoUrl?: string | null;
  emailBrandTitle?: string | null;
  emailAccentColor?: string | null;
  emailLegalFooter?: string | null;
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
      emailAccentColor: row?.emailAccentColor ?? null,
      emailLegalFooter: row?.emailLegalFooter ?? null,
      defaultFromDisplayName: row?.defaultFromDisplayName ?? null,
      hidePlatformEmailChrome: row?.hidePlatformEmailChrome ?? false,
      emailSocialLinks: await this.loadEmailSocialLinks(organizationId),
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
    const patch: Partial<MailOrganizationBrandingEntity> = {};
    if (input.logoUrl !== undefined) {
      patch.logoUrl = this.normalizeLogoUrl(input.logoUrl);
    }
    if (input.emailBrandTitle !== undefined) {
      patch.emailBrandTitle = this.normalizeShortText(input.emailBrandTitle);
    }
    if (input.emailAccentColor !== undefined) {
      patch.emailAccentColor = this.normalizeAccentColor(input.emailAccentColor);
    }
    if (input.emailLegalFooter !== undefined) {
      patch.emailLegalFooter = this.normalizeLegalFooter(input.emailLegalFooter);
    }
    if (input.defaultFromDisplayName !== undefined) {
      patch.defaultFromDisplayName = this.normalizeShortText(
        input.defaultFromDisplayName,
      );
      await this.syncDefaultSenderDisplayName(
        organizationId,
        patch.defaultFromDisplayName,
      );
    }
    if (input.hidePlatformEmailChrome !== undefined) {
      patch.hidePlatformEmailChrome = Boolean(input.hidePlatformEmailChrome);
    }
    const existing = await this.brandingRepository.findOne({
      where: { organizationId },
    });
    if (!existing) {
      await this.brandingRepository.insert({
        organizationId,
        hidePlatformEmailChrome: false,
        ...patch,
      });
    } else if (Object.keys(patch).length > 0) {
      // Yalnızca white-label alanları — email_social_links jsonb'ye dokunulmaz (save() sıfırlama riski).
      await this.brandingRepository.update({ organizationId }, patch);
    }
    return this.getSnapshot(organizationId);
  }

  /** Giden e-posta alt bilgisi sosyal bağlantıları (tüm planlar). */
  public async updateEmailSocialLinks(
    organizationId: string,
    raw: unknown,
    options?: { allowClear?: boolean },
  ): Promise<MailOrganizationBrandingSnapshot> {
    if (raw === undefined) {
      return this.getSnapshot(organizationId);
    }
    if (!Array.isArray(raw)) {
      throw new BadRequestException("emailSocialLinks bir dizi olmalıdır.");
    }
    const hadInput = raw.some(
      (row) =>
        row &&
        typeof row === "object" &&
        String((row as { url?: string }).url ?? "").trim(),
    );
    const emailSocialLinks = normalizeMailEmailSocialLinks(raw);
    if (hadInput && emailSocialLinks.length === 0) {
      throw new BadRequestException(
        "Geçerli sosyal bağlantı bulunamadı. https://… tam adresi veya Instagram/X/TikTok için @kullaniciadi girin.",
      );
    }
    if (emailSocialLinks.length === 0 && !options?.allowClear) {
      throw new BadRequestException(
        "Boş kayıt mevcut sosyal bağlantıları silmez. En az bir adres girin veya «Tümünü kaldır» kullanın.",
      );
    }
    const stored =
      emailSocialLinks.length > 0 ? emailSocialLinks : null;
    await this.persistEmailSocialLinks(organizationId, stored);
    return this.getSnapshot(organizationId);
  }

  /** Webmail SMTP çıkış sarmalayıcısı (tüm planlar: firma adı; Enterprise: logo/renk). */
  public async resolveOutboundWrapBranding(
    organizationId: string,
    companyName: string,
  ): Promise<OutboundWrapBranding> {
    const plan = await this.mailSaasSubscriptionService.getOrganizationMailPlan(
      organizationId,
    );
    const whiteLabel = this.isWhiteLabelAllowedForPlanCode(plan.planCode);
    const row = await this.brandingRepository.findOne({
      where: { organizationId },
    });
    const brandTitle =
      row?.emailBrandTitle?.trim() || companyName.trim() || "Lerta Posta";
    return {
      brandTitle,
      logoUrl: whiteLabel && row?.logoUrl?.trim() ? row.logoUrl.trim() : null,
      accentColor:
        (whiteLabel && row?.emailAccentColor?.trim()) || "#1a1647",
      hidePlatformFooter: whiteLabel && Boolean(row?.hidePlatformEmailChrome),
      legalFooterText:
        whiteLabel && row?.emailLegalFooter?.trim()
          ? row.emailLegalFooter.trim()
          : null,
      socialLinks: await this.loadEmailSocialLinks(organizationId),
    };
  }

  /** jsonb kolonu — TypeORM karma adlandırmada güvenilir okuma. */
  private async loadEmailSocialLinks(
    organizationId: string,
  ): Promise<MailEmailSocialLink[]> {
    const rows: Array<{ email_social_links: unknown }> =
      await this.brandingRepository.manager.query(
        `SELECT email_social_links FROM mail_organization_branding WHERE "organizationId" = $1 LIMIT 1`,
        [organizationId],
      );
    return normalizeMailEmailSocialLinks(rows[0]?.email_social_links);
  }

  private async persistEmailSocialLinks(
    organizationId: string,
    links: MailEmailSocialLink[] | null,
  ): Promise<void> {
    const existing = await this.brandingRepository.findOne({
      where: { organizationId },
    });
    if (!existing) {
      await this.brandingRepository.save(
        this.brandingRepository.create({
          organizationId,
          emailSocialLinks: links,
        }),
      );
      return;
    }
    await this.brandingRepository.manager.query(
      `UPDATE mail_organization_branding SET email_social_links = $1::jsonb, "updatedAt" = NOW() WHERE "organizationId" = $2`,
      [links ? JSON.stringify(links) : null, organizationId],
    );
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

  private normalizeLegalFooter(value: string | null): string | null {
    if (value === null) {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    return trimmed.slice(0, 500);
  }

  private normalizeAccentColor(value: string | null): string | null {
    if (value === null) {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
      throw new BadRequestException(
        "Vurgu rengi #RRGGBB formatında olmalıdır (ör. #1a1647).",
      );
    }
    return trimmed.toLowerCase();
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
