import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailCustomDomainService } from "./MailCustomDomainService";
import { EmailEngagementService } from "./EmailEngagementService";
import { EmailSuppressionService } from "./EmailSuppressionService";
import { MailDmarcAggregateService } from "./MailDmarcAggregateService";
import { MailDmarcAggregateReportEntity } from "../../infrastructure/database/entities/MailDmarcAggregateReportEntity";

@Injectable()
export class MailDeliverabilityHubService {
  public constructor(
    private readonly mailCustomDomainService: MailCustomDomainService,
    private readonly emailEngagementService: EmailEngagementService,
    private readonly emailSuppressionService: EmailSuppressionService,
    private readonly mailDmarcAggregateService: MailDmarcAggregateService,
    @InjectRepository(MailDmarcAggregateReportEntity)
    private readonly dmarcRepository: Repository<MailDmarcAggregateReportEntity>,
  ) {}

  public async buildHub(
    organizationId: string,
    days = 30,
  ): Promise<{
    periodDays: number;
    dns: {
      domain: string | null;
      ok: boolean;
      mx: boolean;
      spf: boolean;
      dkim: boolean;
    } | null;
    engagement: Awaited<
      ReturnType<EmailEngagementService["getEngagementSummary"]>
    >;
    suppressionCount: number;
    dmarcReports90d: number;
    dmarc: {
      reportRows: number;
      messageCount: number;
      dkimPassRatePercent: number | null;
      spfPassRatePercent: number | null;
    };
    score: number;
    hintsTr: string[];
  }> {
    const periodDays = days <= 0 || days > 90 ? 30 : days;
    const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    const engagement = await this.emailEngagementService.getEngagementSummary(
      since,
      organizationId,
    );
    const bundle =
      await this.mailCustomDomainService.getOrganizationBundle(organizationId);
    const suppressionCount =
      await this.emailSuppressionService.countForOrganization(organizationId);
    const dmarcReports90d = await this.dmarcRepository.count({
      where: { organizationId },
    });
    const dmarcPanel = await this.mailDmarcAggregateService.listForOrganization(
      organizationId,
      periodDays,
    );
    const dmarc = this.summarizeDmarcPanel(dmarcPanel);
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
      engagement.bounceRatePercent != null &&
      engagement.bounceRatePercent > 3
    ) {
      hintsTr.push(
        `Son ${periodDays} günde bounce oranı yükselmiş — listeyi temizleyin.`,
      );
    }
    if (suppressionCount > 50) {
      hintsTr.push("Suppression listesi büyük — teslimat kalitesini izleyin.");
    }
    if (dmarc.dkimFail > 0 || dmarc.spfFail > 0) {
      hintsTr.push(
        "DMARC aggregate: DKIM/SPF fail kayıtları var — DNS ve From hizasını kontrol edin.",
      );
    }
    let score = 72;
    if (dnsBlock?.ok) {
      score += 12;
    }
    if (
      engagement.bounceRatePercent == null ||
      engagement.bounceRatePercent < 2
    ) {
      score += 8;
    }
    if (dmarc.reportRows > 0) {
      score += 8;
    }
    score = Math.min(100, score);
    return {
      periodDays,
      dns: dnsBlock,
      engagement,
      suppressionCount,
      dmarcReports90d,
      dmarc: {
        reportRows: dmarc.reportRows,
        messageCount: dmarc.messageCount,
        dkimPassRatePercent: dmarc.dkimPassRatePercent,
        spfPassRatePercent: dmarc.spfPassRatePercent,
      },
      score,
      hintsTr,
    };
  }

  private summarizeDmarcPanel(
    panel: Awaited<
      ReturnType<MailDmarcAggregateService["listForOrganization"]>
    >,
  ): {
    reportRows: number;
    messageCount: number;
    dkimPass: number;
    dkimFail: number;
    spfPass: number;
    spfFail: number;
    dkimPassRatePercent: number | null;
    spfPassRatePercent: number | null;
  } {
    let reportRows = 0;
    let messageCount = 0;
    let dkimPass = 0;
    let dkimFail = 0;
    let spfPass = 0;
    let spfFail = 0;
    for (const bucket of panel.domains) {
      reportRows += bucket.reports.length;
      messageCount += bucket.totals.messageCount;
      dkimPass += bucket.totals.dkimPass;
      dkimFail += bucket.totals.dkimFail;
      spfPass += bucket.totals.spfPass;
      spfFail += bucket.totals.spfFail;
    }
    const dkimDenom = dkimPass + dkimFail;
    const spfDenom = spfPass + spfFail;
    return {
      reportRows,
      messageCount,
      dkimPass,
      dkimFail,
      spfPass,
      spfFail,
      dkimPassRatePercent:
        dkimDenom > 0
          ? Math.round((dkimPass / dkimDenom) * 1000) / 10
          : null,
      spfPassRatePercent:
        spfDenom > 0 ? Math.round((spfPass / spfDenom) * 1000) / 10 : null,
    };
  }
}
