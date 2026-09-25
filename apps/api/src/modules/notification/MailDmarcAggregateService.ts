import { ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, MoreThanOrEqual, Repository } from "typeorm";
import { MailDmarcAggregateReportEntity } from "../../infrastructure/database/entities/MailDmarcAggregateReportEntity";
import { MailDomainEntity } from "../../infrastructure/database/entities/MailDomainEntity";
import { MailSenderIdentityEntity } from "../../infrastructure/database/entities/MailSenderIdentityEntity";
import {
  parseDmarcAggregateXml,
  type ParsedDmarcAggregate,
} from "./MailDmarcAggregateParse";

@Injectable()
export class MailDmarcAggregateService {
  public constructor(
    @InjectRepository(MailDmarcAggregateReportEntity)
    private readonly reportRepository: Repository<MailDmarcAggregateReportEntity>,
    @InjectRepository(MailDomainEntity)
    private readonly domainRepository: Repository<MailDomainEntity>,
    @InjectRepository(MailSenderIdentityEntity)
    private readonly senderRepository: Repository<MailSenderIdentityEntity>,
  ) {}

  public async ingestFromXml(params: {
    xml: string;
    organizationId?: string | null;
  }): Promise<MailDmarcAggregateReportEntity> {
    const parsed = parseDmarcAggregateXml(params.xml);
    const organizationId =
      params.organizationId?.trim() ||
      (await this.resolveOrganizationIdForDomain(parsed.domain));
    return this.upsertReport({ ...parsed, organizationId });
  }

  public async ingestSummary(
    parsed: ParsedDmarcAggregate & { organizationId?: string | null },
  ): Promise<MailDmarcAggregateReportEntity> {
    const organizationId =
      parsed.organizationId?.trim() ||
      (await this.resolveOrganizationIdForDomain(parsed.domain));
    return this.upsertReport({ ...parsed, organizationId });
  }

  public async listForOrganization(organizationId: string, days = 30) {
    const resolvedDays = days <= 0 || days > 90 ? 30 : days;
    const since = this.daysAgo(resolvedDays);
    const domains = await this.resolveOrganizationDomains(organizationId);
    if (domains.length === 0) {
      return { days: resolvedDays, domains: [] };
    }

    const rows = await this.reportRepository.find({
      where: {
        organizationId,
        domain: In(domains),
        periodEnd: MoreThanOrEqual(since),
      },
      order: { periodEnd: "DESC" },
      take: 200,
    });

    const byDomain = new Map<string, MailDmarcAggregateReportEntity[]>();
    for (const row of rows) {
      const bucket = byDomain.get(row.domain) ?? [];
      bucket.push(row);
      byDomain.set(row.domain, bucket);
    }

    return {
      days: resolvedDays,
      domains: domains.map((domain) => {
        const reports = (byDomain.get(domain) ?? []).map((row) => this.toDto(row));
        const totals = this.sumReports(reports);
        return { domain, reports, totals };
      }),
    };
  }

  public async assertDomainAccess(
    organizationId: string,
    domain: string,
  ): Promise<void> {
    const domains = await this.resolveOrganizationDomains(organizationId);
    if (!domains.includes(domain.toLowerCase())) {
      throw new ForbiddenException("Bu domain için DMARC raporu yok");
    }
  }

  private async upsertReport(
    parsed: ParsedDmarcAggregate & { organizationId: string | null },
  ): Promise<MailDmarcAggregateReportEntity> {
    const existing = await this.reportRepository.findOne({
      where: {
        domain: parsed.domain,
        periodStart: parsed.periodStart,
        periodEnd: parsed.periodEnd,
        reporterOrgName:
          parsed.reporterOrgName === null
            ? IsNull()
            : parsed.reporterOrgName,
      },
    });
    if (existing) {
      existing.organizationId = parsed.organizationId;
      existing.messageCount = parsed.messageCount;
      existing.dispositionNone = parsed.dispositionNone;
      existing.dispositionQuarantine = parsed.dispositionQuarantine;
      existing.dispositionReject = parsed.dispositionReject;
      existing.dkimPass = parsed.dkimPass;
      existing.dkimFail = parsed.dkimFail;
      existing.spfPass = parsed.spfPass;
      existing.spfFail = parsed.spfFail;
      return this.reportRepository.save(existing);
    }
    return this.reportRepository.save(
      this.reportRepository.create({
        organizationId: parsed.organizationId,
        domain: parsed.domain,
        periodStart: parsed.periodStart,
        periodEnd: parsed.periodEnd,
        messageCount: parsed.messageCount,
        dispositionNone: parsed.dispositionNone,
        dispositionQuarantine: parsed.dispositionQuarantine,
        dispositionReject: parsed.dispositionReject,
        dkimPass: parsed.dkimPass,
        dkimFail: parsed.dkimFail,
        spfPass: parsed.spfPass,
        spfFail: parsed.spfFail,
        reporterOrgName: parsed.reporterOrgName,
      }),
    );
  }

  private async resolveOrganizationIdForDomain(
    domain: string,
  ): Promise<string | null> {
    const row = await this.domainRepository.findOne({
      where: { domain: domain.toLowerCase() },
    });
    return row?.organizationId ?? null;
  }

  private async resolveOrganizationDomains(
    organizationId: string,
  ): Promise<string[]> {
    const domainRows = await this.domainRepository.find({
      where: { organizationId },
    });
    const fromDomains = domainRows.map((row) => row.domain.toLowerCase());
    const senders = await this.senderRepository.find({
      where: { organizationId },
      relations: { mailDomain: true },
    });
    for (const sender of senders) {
      if (sender.mailDomain?.domain) {
        fromDomains.push(sender.mailDomain.domain.toLowerCase());
      }
    }
    return [...new Set(fromDomains)];
  }

  private toDto(row: MailDmarcAggregateReportEntity) {
    return {
      id: row.id,
      domain: row.domain,
      periodStart: row.periodStart.toISOString(),
      periodEnd: row.periodEnd.toISOString(),
      messageCount: row.messageCount,
      disposition: {
        none: row.dispositionNone,
        quarantine: row.dispositionQuarantine,
        reject: row.dispositionReject,
      },
      dkim: { pass: row.dkimPass, fail: row.dkimFail },
      spf: { pass: row.spfPass, fail: row.spfFail },
      reporterOrgName: row.reporterOrgName,
      ingestedAt: row.ingestedAt.toISOString(),
    };
  }

  private sumReports(
    reports: ReturnType<MailDmarcAggregateService["toDto"]>[],
  ) {
    return reports.reduce(
      (acc, row) => ({
        messageCount: acc.messageCount + row.messageCount,
        dispositionNone: acc.dispositionNone + row.disposition.none,
        dispositionQuarantine:
          acc.dispositionQuarantine + row.disposition.quarantine,
        dispositionReject: acc.dispositionReject + row.disposition.reject,
        dkimPass: acc.dkimPass + row.dkim.pass,
        dkimFail: acc.dkimFail + row.dkim.fail,
        spfPass: acc.spfPass + row.spf.pass,
        spfFail: acc.spfFail + row.spf.fail,
      }),
      {
        messageCount: 0,
        dispositionNone: 0,
        dispositionQuarantine: 0,
        dispositionReject: 0,
        dkimPass: 0,
        dkimFail: 0,
        spfPass: 0,
        spfFail: 0,
      },
    );
  }

  private daysAgo(days: number): Date {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - days);
    return date;
  }
}
