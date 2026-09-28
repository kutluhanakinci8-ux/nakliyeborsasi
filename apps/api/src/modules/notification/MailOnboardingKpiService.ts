import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailMailboxEntity } from "../../infrastructure/database/entities/MailMailboxEntity";
import { MailInboundMessageEntity } from "../../infrastructure/database/entities/MailInboundMessageEntity";
import { MailDomainEntity } from "../../infrastructure/database/entities/MailDomainEntity";

export type MailOnboardingKpiSnapshot = {
  mailboxesTotal: number;
  mailboxesWithInbound: number;
  mailboxesDnsVerified: number;
  medianHoursToFirstInbound: number | null;
  conversionSignupToFirstMailPercent: number | null;
};

@Injectable()
export class MailOnboardingKpiService {
  public constructor(
    @InjectRepository(MailMailboxEntity)
    private readonly mailboxRepository: Repository<MailMailboxEntity>,
    @InjectRepository(MailInboundMessageEntity)
    private readonly inboundRepository: Repository<MailInboundMessageEntity>,
    @InjectRepository(MailDomainEntity)
    private readonly domainRepository: Repository<MailDomainEntity>,
  ) {}

  public async buildSnapshot(): Promise<MailOnboardingKpiSnapshot> {
    const mailboxes = await this.mailboxRepository.find({
      order: { createdAt: "ASC" },
      take: 500,
    });
    const mailboxesTotal = mailboxes.length;
    let mailboxesWithInbound = 0;
    const hoursSamples: number[] = [];
    for (const mailbox of mailboxes) {
      const first = await this.inboundRepository.findOne({
        where: { mailboxId: mailbox.id },
        order: { receivedAt: "ASC" },
      });
      if (first) {
        mailboxesWithInbound += 1;
        const hours =
          (first.receivedAt.getTime() - mailbox.createdAt.getTime()) /
          (1000 * 60 * 60);
        if (hours >= 0 && hours < 24 * 90) {
          hoursSamples.push(hours);
        }
      }
    }
    const verifiedDomains = await this.domainRepository
      .createQueryBuilder("d")
      .where("d.verificationStatus = :status", { status: "verified" })
      .getCount();
    hoursSamples.sort((a, b) => a - b);
    const medianHoursToFirstInbound =
      hoursSamples.length > 0
        ? hoursSamples[Math.floor(hoursSamples.length / 2)]
        : null;
    const conversionSignupToFirstMailPercent =
      mailboxesTotal > 0
        ? Math.round((mailboxesWithInbound / mailboxesTotal) * 1000) / 10
        : null;
    return {
      mailboxesTotal,
      mailboxesWithInbound,
      mailboxesDnsVerified: verifiedDomains,
      medianHoursToFirstInbound,
      conversionSignupToFirstMailPercent,
    };
  }
}
