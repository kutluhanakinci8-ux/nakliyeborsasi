import { Injectable } from "@nestjs/common";
import type { MailMarketingCampaignSegment } from "../../infrastructure/database/entities/MailMarketingCampaignEntity";
import { recipientMatchesCampaignSegment } from "./MailCampaignSegment";
import { EmailSuppressionService } from "./EmailSuppressionService";
import type { CampaignRecipientPreviewRow } from "./MailCampaignRecipientPreview";

@Injectable()
export class MailCampaignRecipientPreviewService {
  public constructor(
    private readonly emailSuppressionService: EmailSuppressionService,
  ) {}

  public async previewForOrganization(
    organizationId: string,
    params: {
      recipients: CampaignRecipientPreviewRow[];
      merge?: { referans?: string; musteriAdi?: string };
      recipientDomainAllowlist?: string[];
      segment?: MailMarketingCampaignSegment;
    },
  ): Promise<{
    total: number;
    matched: number;
    skippedInvalid: number;
    skippedDomain: number;
    skippedSegment: number;
    skippedSuppressed: number;
  }> {
    const domainAllowlist = normalizeCampaignDomainAllowlist(
      params.recipientDomainAllowlist,
    );
    let matched = 0;
    let skippedInvalid = 0;
    let skippedDomain = 0;
    let skippedSegment = 0;
    let skippedSuppressed = 0;
    for (const row of params.recipients) {
      const email = row.email.trim().toLowerCase();
      if (!isLikelyEmail(email)) {
        skippedInvalid += 1;
        continue;
      }
      if (
        domainAllowlist.length > 0 &&
        !recipientMatchesCampaignDomain(email, domainAllowlist)
      ) {
        skippedDomain += 1;
        continue;
      }
      const merge = {
        referans: row.referans?.trim() || params.merge?.referans,
        musteriAdi: row.musteriAdi?.trim() || params.merge?.musteriAdi,
      };
      if (
        !recipientMatchesCampaignSegment(
          { referans: merge.referans, musteriAdi: merge.musteriAdi },
          params.segment,
        )
      ) {
        skippedSegment += 1;
        continue;
      }
      if (
        await this.emailSuppressionService.isSuppressed(email, organizationId)
      ) {
        skippedSuppressed += 1;
        continue;
      }
      matched += 1;
    }
    return {
      total: params.recipients.length,
      matched,
      skippedInvalid,
      skippedDomain,
      skippedSegment,
      skippedSuppressed,
    };
  }
}

function normalizeCampaignDomainAllowlist(allowlist?: string[]): string[] {
  if (!allowlist?.length) {
    return [];
  }
  return allowlist
    .map((row) => row.trim().toLowerCase().replace(/^@+/, ""))
    .filter((row) => row.length > 0);
}

function recipientMatchesCampaignDomain(
  email: string,
  allowlist: string[],
): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) {
    return false;
  }
  return allowlist.some(
    (allowed) => domain === allowed || domain.endsWith(`.${allowed}`),
  );
}

function isLikelyEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
