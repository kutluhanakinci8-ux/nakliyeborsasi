import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "node:crypto";
import { EmailSuppressionService } from "./EmailSuppressionService";
import { MailIdentityAuditService } from "./MailIdentityAuditService";
import { MailIdentityAuditAction } from "./MailIdentityAuditAction";
import { MailOrganizationBrandingService } from "./MailOrganizationBrandingService";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CompanyEntity } from "../../infrastructure/database/entities/CompanyEntity";

const TOKEN_TTL_MS = 365 * 24 * 60 * 60 * 1000;

@Injectable()
export class MailMarketingUnsubscribeService {
  public constructor(
    private readonly configService: ConfigService,
    private readonly emailSuppressionService: EmailSuppressionService,
    private readonly mailIdentityAuditService: MailIdentityAuditService,
    private readonly mailOrganizationBrandingService: MailOrganizationBrandingService,
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,
  ) {}

  public buildUnsubscribeUrl(organizationId: string, email: string): string {
    const token = this.signToken(organizationId, email);
    const base = this.resolvePublicApiBase();
    return `${base}/public/lerta-mail/marketing-unsubscribe?token=${encodeURIComponent(token)}`;
  }

  public async processToken(token: string): Promise<{
    ok: boolean;
    organizationId?: string;
    email?: string;
    alreadySuppressed?: boolean;
  }> {
    const parsed = this.verifyToken(token);
    if (!parsed) {
      return { ok: false };
    }
    const already = await this.emailSuppressionService.isSuppressed(
      parsed.email,
      parsed.organizationId,
    );
    if (!already) {
      await this.emailSuppressionService.addSuppression({
        email: parsed.email,
        organizationId: parsed.organizationId,
        reason: "marketing_unsubscribe",
        source: "mail_marketing_unsubscribe_link",
        note: "List-Unsubscribe / kampanya abonelik iptali",
      });
    }
    await this.mailIdentityAuditService.record({
      actorUserId: null,
      actorCompanyId: parsed.organizationId,
      actionCode: MailIdentityAuditAction.MarketingUnsubscribe,
      metadata: {
        email: parsed.email,
        alreadySuppressed: already,
      },
      requestPath: "/public/lerta-mail/marketing-unsubscribe",
    });
    return {
      ok: true,
      organizationId: parsed.organizationId,
      email: parsed.email,
      alreadySuppressed: already,
    };
  }

  public async resolveUnsubscribeBranding(organizationId: string): Promise<{
    brandTitle: string;
    logoUrl: string | null;
    accentColor: string;
  }> {
    const company = await this.companyRepository.findOne({
      where: { id: organizationId },
    });
    const companyName = company?.legalName?.trim() || "Kurumsal hesap";
    const branding =
      await this.mailOrganizationBrandingService.getSnapshot(organizationId);
    return {
      brandTitle: branding.emailBrandTitle?.trim() || companyName,
      logoUrl: branding.logoUrl,
      accentColor: branding.emailAccentColor?.trim() || "#1a1647",
    };
  }

  private signToken(organizationId: string, email: string): string {
    const exp = Date.now() + TOKEN_TTL_MS;
    const payload = `${organizationId}:${email.toLowerCase()}:${exp}`;
    const sig = createHmac("sha256", this.resolveSecret())
      .update(payload)
      .digest("base64url");
    return `${Buffer.from(payload).toString("base64url")}.${sig}`;
  }

  private verifyToken(
    token: string,
  ): { organizationId: string; email: string } | null {
    const parts = token.split(".");
    if (parts.length !== 2) {
      return null;
    }
    const [payloadB64, sig] = parts;
    if (!payloadB64 || !sig) {
      return null;
    }
    let payload: string;
    try {
      payload = Buffer.from(payloadB64, "base64url").toString("utf8");
    } catch {
      return null;
    }
    const segments = payload.split(":");
    if (segments.length !== 3) {
      return null;
    }
    const [organizationId, email, expRaw] = segments;
    const exp = Number.parseInt(expRaw, 10);
    if (!organizationId || !email || !Number.isFinite(exp) || exp < Date.now()) {
      return null;
    }
    const expected = createHmac("sha256", this.resolveSecret())
      .update(payload)
      .digest("base64url");
    if (!this.safeEqual(sig, expected)) {
      return null;
    }
    return { organizationId, email };
  }

  private safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  }

  private resolveSecret(): string {
    return (
      this.configService.get<string>("MAIL_MARKETING_UNSUBSCRIBE_SECRET") ??
      this.configService.get<string>("JWT_ACCESS_SECRET") ??
      "lerta-mail-marketing-unsub-dev"
    );
  }

  private resolvePublicApiBase(): string {
    const raw =
      this.configService.get<string>("MAIL_API_PUBLIC_URL")?.trim() ||
      this.configService.get<string>("API_PUBLIC_URL")?.trim() ||
      "https://app.lerta.com.tr/api/v1";
    return raw.replace(/\/$/, "");
  }
}
