import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailMailboxEntity } from "../../infrastructure/database/entities/MailMailboxEntity";
import { CompanyMembershipEntity } from "../../infrastructure/database/entities/CompanyMembershipEntity";
import { MailOrganizationInboxService } from "./MailOrganizationInboxService";
import { MailAiComposeService } from "./MailAiComposeService";
import { normalizeInboxCategory } from "./MailInboxCategoryCatalog";

@Injectable()
export class MailInboxAiFocusBackgroundService {
  private readonly logger = new Logger(MailInboxAiFocusBackgroundService.name);

  public constructor(
    @InjectRepository(MailMailboxEntity)
    private readonly mailboxRepository: Repository<MailMailboxEntity>,
    @InjectRepository(CompanyMembershipEntity)
    private readonly membershipRepository: Repository<CompanyMembershipEntity>,
    private readonly mailOrganizationInboxService: MailOrganizationInboxService,
    private readonly mailAiComposeService: MailAiComposeService,
  ) {}

  public async runClassificationCycle(limitPerOrg = 25): Promise<{
    organizations: number;
    updated: number;
    skipped: number;
  }> {
    const orgIds = await this.distinctOrganizationIds();
    let updated = 0;
    let skipped = 0;
    for (const organizationId of orgIds) {
      const userId = await this.resolveActorUserId(organizationId);
      if (!userId) {
        continue;
      }
      try {
        const outcome = await this.mailOrganizationInboxService.refreshAiFocusBatch(
          organizationId,
          userId,
          async (snippet) => {
            const classified = await this.mailAiComposeService.classifyInbound({
              userId,
              subject: snippet.subject,
              bodySnippet: snippet.bodySnippet,
            });
            return {
              lane: classified.focusLane,
              category: classified.inboxCategory
                ? (classified.inboxCategory as "promotions" | "updates" | "social" | "forums" | "commercial")
                : null,
            };
          },
          undefined,
          limitPerOrg,
        );
        updated += outcome.updated;
        skipped += outcome.skipped;
      } catch (error) {
        this.logger.warn(
          `AI focus org=${organizationId}: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    }
    return { organizations: orgIds.length, updated, skipped };
  }

  private async distinctOrganizationIds(): Promise<string[]> {
    const rows = await this.mailboxRepository
      .createQueryBuilder("m")
      .select("DISTINCT m.organizationId", "organizationId")
      .where("m.status = :status", { status: "active" })
      .getRawMany<{ organizationId: string }>();
    return rows.map((row) => row.organizationId);
  }

  private async resolveActorUserId(organizationId: string): Promise<string | null> {
    const mailbox = await this.mailboxRepository.findOne({
      where: { organizationId, status: "active" },
      order: { createdAt: "ASC" },
    });
    if (mailbox?.ownerUserId) {
      return mailbox.ownerUserId;
    }
    const member = await this.membershipRepository.findOne({
      where: { companyId: organizationId },
      order: { createdAt: "ASC" },
    });
    return member?.userId ?? null;
  }
}
