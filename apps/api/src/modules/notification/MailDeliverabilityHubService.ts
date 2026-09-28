import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailCustomDomainService } from "./MailCustomDomainService";
import { EmailEngagementService } from "./EmailEngagementService";
import { EmailSuppressionService } from "./EmailSuppressionService";
import { MailDmarcAggregateReportEntity } from "../../infrastructure/database/entities/MailDmarcAggregateReportEntity";

@Injectable()
export class MailDeliverabilityHubService {
  public constructor(
    private readonly mailCustomDomainService: MailCustomDomainService,
    private readonly emailEngagementService: EmailEngagementService,
    private readonly emailSuppressionService: EmailSuppressionService,
    @InjectRepository(MailDmarcAggregateReportEntity)
    private readonly dmarcRepository: Repository<MailDmarcAggregateReportEntity>,
  ) {}

  public async buildHub(organizationId: string): Promise<{
    dns: {
      domain: string | null;
      ok: boolean;
      mx: boolean;
      spf: boolean;
      dkim: boolean;
    } | null;
    engagement30d: Awaited<
      ReturnType<EmailEngagementService["getEngagementSummary"]>
    >;
    suppressionCount: number;
    dmarcReports90d: number;
    score: number;
    hintsTr: string[];
  }> {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const engagement30d = await this.emailEngagementService.getEngagementSummary(
      since,
    );
    const bundle =
      await this.mailCustomDomainService.getOrganizationBundle(organizationId);
    const suppressionCount =
      await this.emailSuppressionService.countForOrganization(organizationId);
    const dmarcReports90d = await this.dmarcRepository.count({
      where: { organizationId },
    });
    const hintsTr: string[] = [];
    let dnsBlock: {
      domain: string | null;
      ok: boolean;
      mx: boolean;
      spf: boolean;
      dkim: boolean;
    } | null = null;
    if (bundle.mailDomain && bundle.dnsCheck) {
      dnsBlock = {
        domain: bundle.mailDomain.domain,
        ok: bundle.dnsCheck.ok,
        mx: bundle.dnsCheck.mx.ok,
        spf: bundle.dnsCheck.spf.ok,
        dkim: bundle.dnsCheck.dkim.ok,
      };
      if (!bundle.dnsCheck.ok) {
        hintsTr.push("SPF, DKIM veya MX kayıtlarını tamamlayın.");
      }
    } else {
      hintsTr.push("Özel domain bağlanmadı — gönderim itibarı sınırlı olabilir.");
    }
    if (
      engagement30d.bounceRatePercent != null &&
      engagement30d.bounceRatePercent > 3
    ) {
      hintsTr.push("Son 30 günde bounce oranı yükselmiş — listeyi temizleyin.");
    }
    if (suppressionCount > 50) {
      hintsTr.push("Suppression listesi büyük — teslimat kalitesini izleyin.");
    }
    let score = 72;
    if (dnsBlock?.ok) {
      score += 12;
    }
    if (engagement30d.bounceRatePercent == null || engagement30d.bounceRatePercent < 2) {
      score += 8;
    }
    if (dmarcReports90d > 0) {
      score += 8;
    }
    score = Math.min(100, score);
    return {
      dns: dnsBlock,
      engagement30d,
      suppressionCount,
      dmarcReports90d,
      score,
      hintsTr,
    };
  }
}
