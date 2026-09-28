import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ValidationException } from "@nakliyeborsasi/core";
import {
  EmailMarketingSegmentDefinition,
  EmailMarketingSegmentEntity,
} from "../../infrastructure/database/entities/EmailMarketingSegmentEntity";
import { EmailMarketingCampaignEntity } from "../../infrastructure/database/entities/EmailMarketingCampaignEntity";
import { EmailMarketingAudienceService } from "./EmailMarketingAudienceService";
import { EmailOutboxService } from "./EmailOutboxService";
const EVENT_CODE = "MARKETING_CAMPAIGN";

@Injectable()
export class EmailMarketingApplicationService {
  public constructor(
    @InjectRepository(EmailMarketingSegmentEntity)
    private readonly segmentRepository: Repository<EmailMarketingSegmentEntity>,
    @InjectRepository(EmailMarketingCampaignEntity)
    private readonly campaignRepository: Repository<EmailMarketingCampaignEntity>,
    private readonly audienceService: EmailMarketingAudienceService,
    private readonly emailOutboxService: EmailOutboxService,
  ) {}

  public async listSegments(): Promise<EmailMarketingSegmentEntity[]> {
    await this.ensureStarterSegments();
    return this.segmentRepository.find({ order: { createdAt: "DESC" } });
  }

  private async ensureStarterSegments(): Promise<void> {
    const count = await this.segmentRepository.count();
    if (count > 0) {
      return;
    }
    await this.segmentRepository.save([
      this.segmentRepository.create({
        name: "Taşıyıcı firmalar (sahip)",
        definition: {
          type: "participant_type",
          participantTypeCodes: ["LOAD_CARRIER"],
        },
      }),
      this.segmentRepository.create({
        name: "Profesyonel plan aboneleri",
        definition: {
          type: "subscription_plan",
          planCodes: ["carrier_professional_tr_ua"],
        },
      }),
    ]);
  }

  public async createSegment(params: {
    name: string;
    definition: EmailMarketingSegmentDefinition;
  }): Promise<EmailMarketingSegmentEntity> {
    const name = params.name.trim();
    if (name.length < 2) {
      throw new ValidationException("Segment adı gerekli");
    }
    return this.segmentRepository.save(
      this.segmentRepository.create({
        name,
        definition: params.definition,
      }),
    );
  }

  public async listCampaigns(): Promise<EmailMarketingCampaignEntity[]> {
    return this.campaignRepository.find({ order: { createdAt: "DESC" } });
  }

  public async createCampaign(params: {
    name: string;
    segmentId: string;
    subjectA: string;
    subjectB?: string | null;
    abTestEnabled?: boolean;
    htmlBody: string;
    textBody: string;
  }): Promise<EmailMarketingCampaignEntity> {
    const segment = await this.segmentRepository.findOne({
      where: { id: params.segmentId },
    });
    if (!segment) {
      throw new ValidationException("Segment bulunamadı");
    }
    const abTestEnabled = Boolean(params.abTestEnabled && params.subjectB?.trim());
    return this.campaignRepository.save(
      this.campaignRepository.create({
        name: params.name.trim(),
        segmentId: params.segmentId,
        subjectA: params.subjectA.trim(),
        subjectB: abTestEnabled ? params.subjectB!.trim() : null,
        abTestEnabled,
        htmlBody: params.htmlBody,
        textBody: params.textBody,
        status: "draft",
        recipientsTargeted: 0,
        recipientsEnqueued: 0,
        sentAt: null,
      }),
    );
  }

  public async sendCampaign(campaignId: string): Promise<EmailMarketingCampaignEntity> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
    });
    if (!campaign) {
      throw new ValidationException("Kampanya bulunamadı");
    }
    if (campaign.status !== "draft") {
      throw new ValidationException("Kampanya zaten gönderildi veya gönderiliyor");
    }
    const segment = await this.segmentRepository.findOne({
      where: { id: campaign.segmentId },
    });
    if (!segment) {
      throw new ValidationException("Segment bulunamadı");
    }
    const recipients = await this.audienceService.resolveSegmentRecipients(segment);
    campaign.status = "sending";
    campaign.recipientsTargeted = recipients.length;
    await this.campaignRepository.save(campaign);

    let enqueued = 0;
    const shuffled = [...recipients].sort(() => Math.random() - 0.5);
    for (let index = 0; index < shuffled.length; index += 1) {
      const recipient = shuffled[index];
      const abVariant =
        campaign.abTestEnabled && campaign.subjectB
          ? index % 2 === 0
            ? "A"
            : "B"
          : "A";
      const subject =
        abVariant === "B" && campaign.subjectB
          ? campaign.subjectB
          : campaign.subjectA;
      const row = await this.emailOutboxService.enqueueMarketingCampaignMessage({
        recipientEmail: recipient.email,
        subject,
        htmlBody: campaign.htmlBody,
        textBody: campaign.textBody,
        idempotencyKey: `marketing-campaign:${campaign.id}:${recipient.email}`,
        metadata: {
          campaignId: campaign.id,
          segmentId: campaign.segmentId,
          abVariant,
          userId: recipient.userId,
          companyId: recipient.companyId,
        },
      });
      if (row) {
        enqueued += 1;
      }
    }

    campaign.status = "sent";
    campaign.recipientsEnqueued = enqueued;
    campaign.sentAt = new Date();
    return this.campaignRepository.save(campaign);
  }

  public async getCampaignAnalytics(campaignId: string): Promise<{
    campaignId: string;
    sent: number;
    uniqueOpens: number;
    totalClicks: number;
    openRatePercent: number | null;
    clickRatePercent: number | null;
    abVariants: {
      variant: string;
      sent: number;
      uniqueOpens: number;
      totalClicks: number;
      openRatePercent: number | null;
    }[];
  }> {
    const rows: Array<{
      ab_variant: string | null;
      sent: string;
      unique_opens: string;
      messages_with_clicks: string;
      total_clicks: string;
    }> = await this.campaignRepository.query(
      `
      SELECT
        COALESCE(metadata->>'abVariant', 'A') AS ab_variant,
        COUNT(*)::text AS sent,
        COUNT(*) FILTER (WHERE "openCount" > 0)::text AS unique_opens,
        COUNT(*) FILTER (WHERE "clickCount" > 0)::text AS messages_with_clicks,
        COALESCE(SUM("clickCount"), 0)::text AS total_clicks
      FROM email_outbox
      WHERE "eventCode" = $1
        AND metadata->>'campaignId' = $2
        AND status = 'sent'
      GROUP BY COALESCE(metadata->>'abVariant', 'A')
      `,
      [EVENT_CODE, campaignId],
    );
    const abVariants = rows.map((row) => {
      const sent = Number.parseInt(row.sent, 10);
      const uniqueOpens = Number.parseInt(row.unique_opens, 10);
      const messagesWithClicks = Number.parseInt(row.messages_with_clicks, 10);
      const totalClicks = Number.parseInt(row.total_clicks, 10);
      return {
        variant: row.ab_variant ?? "A",
        sent,
        uniqueOpens,
        messagesWithClicks,
        totalClicks,
        clickRatePercent:
          sent > 0
            ? Math.round((messagesWithClicks / sent) * 1000) / 10
            : null,
        openRatePercent:
          sent > 0 ? Math.round((uniqueOpens / sent) * 1000) / 10 : null,
      };
    });
    const sent = abVariants.reduce((sum, row) => sum + row.sent, 0);
    const uniqueOpens = abVariants.reduce((sum, row) => sum + row.uniqueOpens, 0);
    const totalClicks = abVariants.reduce((sum, row) => sum + row.totalClicks, 0);
    const messagesWithClicks = rows.reduce(
      (sum, row) => sum + Number.parseInt(row.messages_with_clicks, 10),
      0,
    );
    return {
      campaignId,
      sent,
      uniqueOpens,
      totalClicks,
      openRatePercent:
        sent > 0 ? Math.round((uniqueOpens / sent) * 1000) / 10 : null,
      clickRatePercent:
        sent > 0
          ? Math.round((messagesWithClicks / sent) * 1000) / 10
          : null,
      abVariants,
    };
  }
}
