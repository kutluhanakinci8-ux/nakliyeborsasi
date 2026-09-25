import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailInboxRuleEntity } from "../../infrastructure/database/entities/MailInboxRuleEntity";
import { MailInboundMessageEntity } from "../../infrastructure/database/entities/MailInboundMessageEntity";
import { MailCustomFolderService } from "./MailCustomFolderService";
import { MailImapMaildirService } from "./MailImapMaildirService";

const MAX_RULES = 20;

export type MailInboxRuleDto = {
  id: string;
  name: string;
  sortOrder: number;
  enabled: boolean;
  fromContains: string | null;
  subjectContains: string | null;
  actionStar: boolean;
  actionCustomFolderId: string | null;
  actionArchive: boolean;
  actionMarkRead: boolean;
  actionTrash: boolean;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class MailInboxRuleService {
  public constructor(
    @InjectRepository(MailInboxRuleEntity)
    private readonly ruleRepository: Repository<MailInboxRuleEntity>,
    @InjectRepository(MailInboundMessageEntity)
    private readonly inboundRepository: Repository<MailInboundMessageEntity>,
    private readonly mailCustomFolderService: MailCustomFolderService,
    private readonly mailImapMaildirService: MailImapMaildirService,
  ) {}

  public async list(organizationId: string): Promise<MailInboxRuleDto[]> {
    const rows = await this.ruleRepository.find({
      where: { organizationId },
      order: { sortOrder: "ASC", createdAt: "ASC" },
    });
    return rows.map((row) => this.toDto(row));
  }

  public async create(
    organizationId: string,
    input: {
      name: string;
      fromContains?: string | null;
      subjectContains?: string | null;
      actionStar?: boolean;
      actionCustomFolderId?: string | null;
      actionArchive?: boolean;
      actionMarkRead?: boolean;
      actionTrash?: boolean;
      enabled?: boolean;
    },
  ): Promise<MailInboxRuleDto> {
    this.validateRuleInput(input);
    const count = await this.ruleRepository.count({
      where: { organizationId },
    });
    if (count >= MAX_RULES) {
      throw new BadRequestException(`En fazla ${MAX_RULES} kural tanımlanabilir.`);
    }
    if (input.actionCustomFolderId) {
      await this.mailCustomFolderService.assertFolder(
        organizationId,
        input.actionCustomFolderId,
      );
    }
    const row = await this.ruleRepository.save(
      this.ruleRepository.create({
        organizationId,
        name: input.name.trim(),
        sortOrder: count,
        enabled: input.enabled ?? true,
        fromContains: this.normalizeOptional(input.fromContains),
        subjectContains: this.normalizeOptional(input.subjectContains),
        actionStar: Boolean(input.actionStar),
        actionCustomFolderId: input.actionCustomFolderId ?? null,
        actionArchive: Boolean(input.actionArchive),
        actionMarkRead: Boolean(input.actionMarkRead),
        actionTrash: Boolean(input.actionTrash),
      }),
    );
    return this.toDto(row);
  }

  public async update(
    organizationId: string,
    ruleId: string,
    input: {
      name?: string;
      fromContains?: string | null;
      subjectContains?: string | null;
      actionStar?: boolean;
      actionCustomFolderId?: string | null;
      actionArchive?: boolean;
      actionMarkRead?: boolean;
      actionTrash?: boolean;
      enabled?: boolean;
    },
  ): Promise<MailInboxRuleDto> {
    const row = await this.assertRule(organizationId, ruleId);
    const merged = {
      name: input.name ?? row.name,
      fromContains:
        input.fromContains !== undefined
          ? this.normalizeOptional(input.fromContains)
          : row.fromContains,
      subjectContains:
        input.subjectContains !== undefined
          ? this.normalizeOptional(input.subjectContains)
          : row.subjectContains,
      actionStar: input.actionStar ?? row.actionStar,
      actionCustomFolderId:
        input.actionCustomFolderId !== undefined
          ? input.actionCustomFolderId
          : row.actionCustomFolderId,
      actionArchive: input.actionArchive ?? row.actionArchive,
      actionMarkRead: input.actionMarkRead ?? row.actionMarkRead,
      actionTrash: input.actionTrash ?? row.actionTrash,
      enabled: input.enabled ?? row.enabled,
    };
    this.validateRuleInput(merged);
    if (merged.actionCustomFolderId) {
      await this.mailCustomFolderService.assertFolder(
        organizationId,
        merged.actionCustomFolderId,
      );
    }
    row.name = merged.name.trim();
    row.fromContains = merged.fromContains;
    row.subjectContains = merged.subjectContains;
    row.actionStar = merged.actionStar;
    row.actionCustomFolderId = merged.actionCustomFolderId;
    row.actionArchive = merged.actionArchive;
    row.actionMarkRead = merged.actionMarkRead;
    row.actionTrash = merged.actionTrash;
    row.enabled = merged.enabled;
    await this.ruleRepository.save(row);
    return this.toDto(row);
  }

  public async reorder(
    organizationId: string,
    ruleIds: string[],
  ): Promise<MailInboxRuleDto[]> {
    const existing = await this.ruleRepository.find({
      where: { organizationId },
    });
    const idSet = new Set(ruleIds);
    if (
      existing.length !== ruleIds.length ||
      existing.some((row) => !idSet.has(row.id))
    ) {
      throw new BadRequestException("Kural sırası listesi geçersiz.");
    }
    await Promise.all(
      ruleIds.map((id, index) =>
        this.ruleRepository.update(
          { id, organizationId },
          { sortOrder: index },
        ),
      ),
    );
    return this.list(organizationId);
  }

  public async remove(organizationId: string, ruleId: string): Promise<void> {
    await this.assertRule(organizationId, ruleId);
    await this.ruleRepository.delete({ id: ruleId, organizationId });
  }

  public async applyToMessage(
    organizationId: string,
    message: MailInboundMessageEntity,
  ): Promise<MailInboundMessageEntity> {
    if (message.mailboxFolder !== "inbox" || message.spamStatus === "blocked") {
      return message;
    }
    const rules = await this.ruleRepository.find({
      where: { organizationId, enabled: true },
      order: { sortOrder: "ASC", createdAt: "ASC" },
    });
    for (const rule of rules) {
      if (!this.matches(rule, message)) {
        continue;
      }
      let changed = false;
      if (rule.actionStar && !message.starredAt) {
        message.starredAt = new Date();
        changed = true;
      }
      if (
        rule.actionCustomFolderId &&
        message.customFolderId !== rule.actionCustomFolderId
      ) {
        message.customFolderId = rule.actionCustomFolderId;
        changed = true;
      }
      if (rule.actionMarkRead && !message.readAt) {
        message.readAt = new Date();
        changed = true;
      }
      if (rule.actionTrash && message.mailboxFolder === "inbox") {
        message.maildirFilePath = this.mailImapMaildirService.relocateMailboxFile(
          message.maildirFilePath,
          "trash",
        );
        message.mailboxFolder = "trash";
        message.customFolderId = null;
        changed = true;
      } else if (rule.actionArchive && message.mailboxFolder === "inbox") {
        message.maildirFilePath = this.mailImapMaildirService.relocateMailboxFile(
          message.maildirFilePath,
          "archive",
        );
        message.mailboxFolder = "archive";
        message.customFolderId = null;
        changed = true;
      }
      if (changed) {
        await this.inboundRepository.save(message);
      }
      break;
    }
    return message;
  }

  private matches(
    rule: MailInboxRuleEntity,
    message: MailInboundMessageEntity,
  ): boolean {
    const fromNeedle = rule.fromContains?.toLowerCase() ?? "";
    const subjectNeedle = rule.subjectContains?.toLowerCase() ?? "";
    if (!fromNeedle && !subjectNeedle) {
      return false;
    }
    const fromOk =
      !fromNeedle || message.fromAddress.toLowerCase().includes(fromNeedle);
    const subjectOk =
      !subjectNeedle || message.subject.toLowerCase().includes(subjectNeedle);
    return fromOk && subjectOk;
  }

  private validateRuleInput(input: {
    fromContains?: string | null;
    subjectContains?: string | null;
    actionStar?: boolean;
    actionCustomFolderId?: string | null;
    actionArchive?: boolean;
    actionMarkRead?: boolean;
    actionTrash?: boolean;
    name?: string;
  }): void {
    const from = this.normalizeOptional(input.fromContains);
    const subject = this.normalizeOptional(input.subjectContains);
    if (!from && !subject) {
      throw new BadRequestException(
        "En az bir koşul gerekli (gönderen veya konu içerir).",
      );
    }
    if (
      !input.actionStar &&
      !input.actionCustomFolderId &&
      !input.actionArchive &&
      !input.actionMarkRead &&
      !input.actionTrash
    ) {
      throw new BadRequestException(
        "En az bir işlem seçin (yıldızla, klasör, arşiv, okundu veya çöp).",
      );
    }
    if (!input.name?.trim()) {
      throw new BadRequestException("Kural adı gerekli.");
    }
  }

  private normalizeOptional(value?: string | null): string | null {
    const trimmed = value?.trim() ?? "";
    return trimmed.length > 0 ? trimmed : null;
  }

  private async assertRule(
    organizationId: string,
    ruleId: string,
  ): Promise<MailInboxRuleEntity> {
    const row = await this.ruleRepository.findOne({
      where: { id: ruleId, organizationId },
    });
    if (!row) {
      throw new NotFoundException("Kural bulunamadı.");
    }
    return row;
  }

  private toDto(row: MailInboxRuleEntity): MailInboxRuleDto {
    return {
      id: row.id,
      name: row.name,
      sortOrder: row.sortOrder,
      enabled: row.enabled,
      fromContains: row.fromContains,
      subjectContains: row.subjectContains,
      actionStar: row.actionStar,
      actionCustomFolderId: row.actionCustomFolderId,
      actionArchive: row.actionArchive,
      actionMarkRead: row.actionMarkRead,
      actionTrash: row.actionTrash,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
