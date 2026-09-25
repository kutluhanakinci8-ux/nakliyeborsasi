import { ForbiddenException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailMailboxEntity } from "../../infrastructure/database/entities/MailMailboxEntity";
import { MailInboundMessageEntity } from "../../infrastructure/database/entities/MailInboundMessageEntity";
import { MailMailboxSentEntity } from "../../infrastructure/database/entities/MailMailboxSentEntity";
import { MailComposeDraftEntity } from "../../infrastructure/database/entities/MailComposeDraftEntity";
import { MailSaasSubscriptionService } from "./MailSaasSubscriptionService";
import { CompanySubscriptionPersistenceService } from "../subscription/CompanySubscriptionPersistenceService";

export type OrgStorageSnapshot = {
  organizationId: string;
  usedBytes: number;
  limitBytes: number;
  remainingBytes: number;
  utilizationPercent: number;
  nearLimit: boolean;
  atLimit: boolean;
  maxAttachmentBytes: number;
  limitLabelGb: number;
  windowLabelTr: string;
};

@Injectable()
export class MailOrganizationStorageService {
  private static readonly nearLimitRatio = 0.8;

  public constructor(
    private readonly configService: ConfigService,
    private readonly mailSaasSubscriptionService: MailSaasSubscriptionService,
    private readonly companySubscriptionPersistenceService: CompanySubscriptionPersistenceService,
    @InjectRepository(MailInboundMessageEntity)
    private readonly inboundRepository: Repository<MailInboundMessageEntity>,
    @InjectRepository(MailMailboxSentEntity)
    private readonly sentRepository: Repository<MailMailboxSentEntity>,
    @InjectRepository(MailComposeDraftEntity)
    private readonly draftRepository: Repository<MailComposeDraftEntity>,
  ) {}

  public async resolveStorageLimitBytes(organizationId: string): Promise<number> {
    const envRaw = this.configService.get<string>("MAIL_ORG_STORAGE_LIMIT_BYTES");
    const envOverride = envRaw ? Number.parseInt(envRaw, 10) : null;
    if (envOverride && Number.isFinite(envOverride) && envOverride > 0) {
      return envOverride;
    }
    const snapshot =
      await this.companySubscriptionPersistenceService.getSnapshot(
        organizationId,
      );
    return this.mailSaasSubscriptionService.resolveStorageLimitBytesForPlanCode(
      snapshot?.activePlan.planCode ?? null,
    );
  }

  public async resolveMaxAttachmentBytes(
    organizationId: string,
  ): Promise<number> {
    const envRaw = this.configService.get<string>("MAIL_MAX_ATTACHMENT_BYTES");
    const envOverride = envRaw ? Number.parseInt(envRaw, 10) : null;
    if (envOverride && Number.isFinite(envOverride) && envOverride > 0) {
      return envOverride;
    }
    const snapshot =
      await this.companySubscriptionPersistenceService.getSnapshot(
        organizationId,
      );
    return this.mailSaasSubscriptionService.resolveMaxAttachmentBytesForPlanCode(
      snapshot?.activePlan.planCode ?? null,
    );
  }

  public async assertCanStore(
    organizationId: string,
    additionalBytes: number,
  ): Promise<void> {
    if (additionalBytes <= 0) {
      return;
    }
    const used = await this.computeUsedBytes(organizationId);
    const limit = await this.resolveStorageLimitBytes(organizationId);
    if (used + additionalBytes > limit) {
      const usedGb = (used / (1024 ** 3)).toFixed(1);
      const limitGb = (limit / (1024 ** 3)).toFixed(0);
      throw new ForbiddenException(
        `Depolama kotası doldu (${usedGb} / ${limitGb} GB). Eski postaları silin veya planı yükseltin.`,
      );
    }
  }

  public async getSnapshot(organizationId: string): Promise<OrgStorageSnapshot> {
    const usedBytes = await this.computeUsedBytes(organizationId);
    const limitBytes = await this.resolveStorageLimitBytes(organizationId);
    const maxAttachmentBytes = await this.resolveMaxAttachmentBytes(
      organizationId,
    );
    const remainingBytes = Math.max(0, limitBytes - usedBytes);
    const utilizationPercent =
      limitBytes > 0
        ? Math.min(100, Math.round((usedBytes / limitBytes) * 100))
        : 0;
    const nearLimit =
      utilizationPercent >=
      Math.round(MailOrganizationStorageService.nearLimitRatio * 100);
    const atLimit = usedBytes >= limitBytes;
    return {
      organizationId,
      usedBytes,
      limitBytes,
      remainingBytes,
      utilizationPercent,
      nearLimit,
      atLimit,
      maxAttachmentBytes,
      limitLabelGb: Math.round((limitBytes / (1024 ** 3)) * 10) / 10,
      windowLabelTr: "Tüm kutular",
    };
  }

  public async computeUsedBytes(organizationId: string): Promise<number> {
    const inbound = await this.inboundRepository
      .createQueryBuilder("m")
      .innerJoin(MailMailboxEntity, "mb", "mb.id = m.mailboxId")
      .where("mb.organizationId = :organizationId", { organizationId })
      .andWhere("m.mailboxFolder != :trash", { trash: "trash" })
      .select(
        `COALESCE(SUM(
          COALESCE(length(m.bodyText), 0)
          + COALESCE(length(m.bodyHtml), 0)
          + COALESCE((
            SELECT SUM((elem->>'sizeBytes')::bigint)
            FROM jsonb_array_elements(m.attachments) elem
          ), 0)
        ), 0)`,
        "bytes",
      )
      .getRawOne<{ bytes: string }>();

    const sent = await this.sentRepository
      .createQueryBuilder("s")
      .where("s.organizationId = :organizationId", { organizationId })
      .select(`COALESCE(SUM(COALESCE(length(s.bodyText), 0)), 0)`, "bytes")
      .getRawOne<{ bytes: string }>();

    const drafts = await this.draftRepository
      .createQueryBuilder("d")
      .where("d.organizationId = :organizationId", { organizationId })
      .select(
        `COALESCE(SUM(
          COALESCE(length(d.bodyText), 0)
          + COALESCE((
            SELECT SUM(
              ceil((length(elem->>'contentBase64')::numeric) * 3 / 4)
            )
            FROM jsonb_array_elements(d.attachments) elem
          ), 0)
        ), 0)`,
        "bytes",
      )
      .getRawOne<{ bytes: string }>();

    return (
      Number.parseInt(inbound?.bytes ?? "0", 10) +
      Number.parseInt(sent?.bytes ?? "0", 10) +
      Number.parseInt(drafts?.bytes ?? "0", 10)
    );
  }
}
