import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { MailInboxRuleEntity } from "../../infrastructure/database/entities/MailInboxRuleEntity";
import { MailInboundMessageEntity } from "../../infrastructure/database/entities/MailInboundMessageEntity";
import { MailMailboxEntity } from "../../infrastructure/database/entities/MailMailboxEntity";
import { MailCustomFolderService } from "./MailCustomFolderService";
import { MailImapMaildirService } from "./MailImapMaildirService";
import {
  conditionGroupsAreValid,
  describeInboxRuleMatchLogic,
  groupHasAnyCondition,
  parseConditionGroupsJson,
  serializeConditionGroups,
  type MailInboxRuleConditionGroup,
  type MailInboxRuleConditionGroups,
} from "./MailInboxRuleConditionGroups";

const MAX_RULES = 20;
const PREVIEW_SCAN_LIMIT = 500;
const APPLY_INBOX_LIMIT = 100;

export type MailInboxRuleDto = {
  id: string;
  name: string;
  sortOrder: number;
  enabled: boolean;
  fromContains: string | null;
  subjectContains: string | null;
  toContains: string | null;
  requireAttachment: boolean;
  matchAnyCondition: boolean;
  conditionGroups: MailInboxRuleConditionGroups | null;
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
    @InjectRepository(MailMailboxEntity)
    private readonly mailboxRepository: Repository<MailMailboxEntity>,
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
      toContains?: string | null;
      requireAttachment?: boolean;
      matchAnyCondition?: boolean;
      conditionGroups?: MailInboxRuleConditionGroups | null;
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
        toContains: this.normalizeOptional(input.toContains),
        requireAttachment: Boolean(input.requireAttachment),
        matchAnyCondition: Boolean(input.matchAnyCondition),
        conditionGroupsJson: serializeConditionGroups(
          input.conditionGroups ?? null,
        ),
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
      toContains?: string | null;
      requireAttachment?: boolean;
      matchAnyCondition?: boolean;
      conditionGroups?: MailInboxRuleConditionGroups | null;
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
      toContains:
        input.toContains !== undefined
          ? this.normalizeOptional(input.toContains)
          : row.toContains,
      requireAttachment:
        input.requireAttachment ?? row.requireAttachment,
      matchAnyCondition:
        input.matchAnyCondition ?? row.matchAnyCondition,
      conditionGroups:
        input.conditionGroups !== undefined
          ? input.conditionGroups
          : parseConditionGroupsJson(row.conditionGroupsJson),
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
    row.toContains = merged.toContains;
    row.requireAttachment = merged.requireAttachment;
    row.matchAnyCondition = merged.matchAnyCondition;
    row.conditionGroupsJson = serializeConditionGroups(
      merged.conditionGroups ?? null,
    );
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
      const changed = await this.applyRuleActions(rule, message);
      if (changed) {
        await this.inboundRepository.save(message);
      }
      break;
    }
    return message;
  }

  public async previewRule(
    organizationId: string,
    ruleId: string,
  ): Promise<{
    matchCount: number;
    scanned: number;
    capped: boolean;
    matchLogicDescription: string;
    samples: Array<{
      id: string;
      fromAddress: string;
      subject: string;
      matchedBecause: string;
    }>;
    nonMatchingSamples: Array<{
      id: string;
      fromAddress: string;
      subject: string;
      failedBecause: string;
    }>;
  }> {
    const rule = await this.assertRule(organizationId, ruleId);
    const messages = await this.loadInboxCandidates(organizationId, PREVIEW_SCAN_LIMIT);
    const matched = messages.filter((message) => this.matches(rule, message));
    const nonMatched = messages.filter((message) => !this.matches(rule, message));
    return {
      matchCount: matched.length,
      scanned: messages.length,
      capped: messages.length >= PREVIEW_SCAN_LIMIT,
      matchLogicDescription: describeInboxRuleMatchLogic({
        fromContains: rule.fromContains,
        subjectContains: rule.subjectContains,
        toContains: rule.toContains,
        requireAttachment: rule.requireAttachment,
        matchAnyCondition: rule.matchAnyCondition,
        conditionGroupsJson: rule.conditionGroupsJson,
      }),
      samples: matched.slice(0, 5).map((m) => ({
        id: m.id,
        fromAddress: m.fromAddress,
        subject: m.subject,
        matchedBecause: this.explainMatch(rule, m),
      })),
      nonMatchingSamples: nonMatched.slice(0, 3).map((m) => ({
        id: m.id,
        fromAddress: m.fromAddress,
        subject: m.subject,
        failedBecause: this.explainNonMatch(rule, m),
      })),
    };
  }

  public async applyRuleToInbox(
    organizationId: string,
    ruleId: string,
  ): Promise<{ applied: number }> {
    const rule = await this.assertRule(organizationId, ruleId);
    const messages = await this.loadInboxCandidates(
      organizationId,
      APPLY_INBOX_LIMIT * 3,
    );
    let applied = 0;
    for (const message of messages) {
      if (applied >= APPLY_INBOX_LIMIT) {
        break;
      }
      if (!this.matches(rule, message)) {
        continue;
      }
      const changed = await this.applyRuleActions(rule, message);
      if (changed) {
        await this.inboundRepository.save(message);
        applied += 1;
      }
    }
    return { applied };
  }

  private async loadInboxCandidates(
    organizationId: string,
    limit: number,
  ): Promise<MailInboundMessageEntity[]> {
    const mailbox = await this.mailboxRepository.findOne({
      where: { organizationId },
    });
    if (!mailbox) {
      return [];
    }
    return this.inboundRepository.find({
      where: {
        mailboxId: mailbox.id,
        mailboxFolder: "inbox",
        spamStatus: In(["clean", "suspected"]),
      },
      order: { receivedAt: "DESC" },
      take: limit,
    });
  }

  private async applyRuleActions(
    rule: MailInboxRuleEntity,
    message: MailInboundMessageEntity,
  ): Promise<boolean> {
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
    return changed;
  }

  private explainNonMatch(
    rule: MailInboxRuleEntity,
    message: MailInboundMessageEntity,
  ): string {
    if (this.matches(rule, message)) {
      return "";
    }
    const groups = parseConditionGroupsJson(rule.conditionGroupsJson);
    if (groups && conditionGroupsAreValid(groups)) {
      const active = groups.groups
        .map((group, index) => ({ group, index }))
        .filter(({ group }) => groupHasAnyCondition(group));
      const failed = active
        .filter(({ group }) => !this.matchesSingleGroup(group, message))
        .map(({ index }) => index + 1);
      if (groups.matchAnyBetweenGroups) {
        if (failed.length === active.length) {
          return `Hiçbir grup tutmadı (denenen: ${active.map(({ index }) => index + 1).join(", ")})`;
        }
        return `Gruplar arası VEYA — eşleşen grup yok (eksik: ${failed.join(", ")})`;
      }
      return `Tüm gruplar gerekli — eksik: ${failed.join(", ")}`;
    }
    const fromNeedle = rule.fromContains?.toLowerCase() ?? "";
    const subjectNeedle = rule.subjectContains?.toLowerCase() ?? "";
    const toNeedle = rule.toContains?.toLowerCase() ?? "";
    const fromOk =
      !fromNeedle ||
      this.fieldMatchesAlternatives(message.fromAddress, fromNeedle);
    const subjectOk =
      !subjectNeedle ||
      this.fieldMatchesAlternatives(message.subject, subjectNeedle);
    const toList = message.toRecipients ?? [];
    const toOk =
      !toNeedle ||
      toList.some((addr) =>
        this.fieldMatchesAlternatives(addr, toNeedle),
      );
    const hasAttachment = (message.attachments?.length ?? 0) > 0;
    const misses: string[] = [];
    if (fromNeedle && !fromOk) {
      misses.push("gönderen");
    }
    if (subjectNeedle && !subjectOk) {
      misses.push("konu");
    }
    if (toNeedle && !toOk) {
      misses.push("alıcı");
    }
    if (rule.requireAttachment && !hasAttachment) {
      misses.push("ek");
    }
    if (rule.matchAnyCondition) {
      return misses.length > 0
        ? `VEYA modu — hiçbiri tutmadı (zayıf: ${misses.join(", ")})`
        : "Koşullar sağlanmadı";
    }
    return misses.length > 0
      ? `Eksik (VE): ${misses.join(", ")}`
      : "Koşullar sağlanmadı";
  }

  private explainMatch(
    rule: MailInboxRuleEntity,
    message: MailInboundMessageEntity,
  ): string {
    if (!this.matches(rule, message)) {
      return "";
    }
    const groups = parseConditionGroupsJson(rule.conditionGroupsJson);
    if (groups && conditionGroupsAreValid(groups)) {
      const matchedIndices: number[] = [];
      groups.groups.forEach((group, index) => {
        if (groupHasAnyCondition(group) && this.matchesSingleGroup(group, message)) {
          matchedIndices.push(index + 1);
        }
      });
      if (groups.matchAnyBetweenGroups) {
        return `Eşleşen grup: ${matchedIndices.join(", ")} (gruplar arası VEYA)`;
      }
      return `Eşleşen gruplar: ${matchedIndices.join(", ")} (tümü gerekli)`;
    }
    const fromNeedle = rule.fromContains?.toLowerCase() ?? "";
    const subjectNeedle = rule.subjectContains?.toLowerCase() ?? "";
    const toNeedle = rule.toContains?.toLowerCase() ?? "";
    const fromOk =
      !fromNeedle ||
      this.fieldMatchesAlternatives(message.fromAddress, fromNeedle);
    const subjectOk =
      !subjectNeedle ||
      this.fieldMatchesAlternatives(message.subject, subjectNeedle);
    const toList = message.toRecipients ?? [];
    const toOk =
      !toNeedle ||
      toList.some((addr) =>
        this.fieldMatchesAlternatives(addr, toNeedle),
      );
    const hasAttachment = (message.attachments?.length ?? 0) > 0;
    const hits: string[] = [];
    if (fromNeedle && fromOk) {
      hits.push("gönderen");
    }
    if (subjectNeedle && subjectOk) {
      hits.push("konu");
    }
    if (toNeedle && toOk) {
      hits.push("alıcı");
    }
    if (rule.requireAttachment && hasAttachment) {
      hits.push("ek");
    }
    if (hits.length === 0) {
      return "Koşul sağlandı";
    }
    const mode = rule.matchAnyCondition ? "VEYA" : "VE";
    return `Eşleşen koşul (${mode}): ${hits.join(", ")}`;
  }

  private matches(
    rule: MailInboxRuleEntity,
    message: MailInboundMessageEntity,
  ): boolean {
    const groups = parseConditionGroupsJson(rule.conditionGroupsJson);
    if (groups && conditionGroupsAreValid(groups)) {
      return this.matchesConditionGroups(groups, message);
    }
    const fromNeedle = rule.fromContains?.toLowerCase() ?? "";
    const subjectNeedle = rule.subjectContains?.toLowerCase() ?? "";
    const toNeedle = rule.toContains?.toLowerCase() ?? "";
    if (!fromNeedle && !subjectNeedle && !toNeedle && !rule.requireAttachment) {
      return false;
    }
    const fromOk =
      !fromNeedle ||
      this.fieldMatchesAlternatives(message.fromAddress, fromNeedle);
    const subjectOk =
      !subjectNeedle ||
      this.fieldMatchesAlternatives(message.subject, subjectNeedle);
    const toList = message.toRecipients ?? [];
    const toOk =
      !toNeedle ||
      toList.some((addr) =>
        this.fieldMatchesAlternatives(addr, toNeedle),
      );
    const hasAttachment = (message.attachments?.length ?? 0) > 0;
    if (rule.matchAnyCondition) {
      const parts: boolean[] = [];
      if (fromNeedle) {
        parts.push(fromOk);
      }
      if (subjectNeedle) {
        parts.push(subjectOk);
      }
      if (toNeedle) {
        parts.push(toOk);
      }
      if (rule.requireAttachment) {
        parts.push(hasAttachment);
      }
      if (parts.length === 0) {
        return false;
      }
      return parts.some(Boolean);
    }
    const attachmentOk = !rule.requireAttachment || hasAttachment;
    return fromOk && subjectOk && toOk && attachmentOk;
  }

  private validateRuleInput(input: {
    fromContains?: string | null;
    subjectContains?: string | null;
    toContains?: string | null;
    requireAttachment?: boolean;
    conditionGroups?: MailInboxRuleConditionGroups | null;
    actionStar?: boolean;
    actionCustomFolderId?: string | null;
    actionArchive?: boolean;
    actionMarkRead?: boolean;
    actionTrash?: boolean;
    name?: string;
  }): void {
    if (input.conditionGroups && conditionGroupsAreValid(input.conditionGroups)) {
      // Gelişmiş gruplar yeterli.
    } else {
      const from = this.normalizeOptional(input.fromContains);
      const subject = this.normalizeOptional(input.subjectContains);
      const to = this.normalizeOptional(input.toContains);
      if (!from && !subject && !to && !input.requireAttachment) {
        throw new BadRequestException(
          "En az bir koşul gerekli (gönderen, alıcı, konu, ek veya koşul grupları).",
        );
      }
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

  private matchesConditionGroups(
    root: MailInboxRuleConditionGroups,
    message: MailInboundMessageEntity,
  ): boolean {
    const active = root.groups.filter(groupHasAnyCondition);
    if (active.length === 0) {
      return false;
    }
    const results = active.map((group) =>
      this.matchesSingleGroup(group, message),
    );
    return root.matchAnyBetweenGroups
      ? results.some(Boolean)
      : results.every(Boolean);
  }

  private matchesSingleGroup(
    group: MailInboxRuleConditionGroup,
    message: MailInboundMessageEntity,
  ): boolean {
    const fromNeedle = group.fromContains?.toLowerCase() ?? "";
    const subjectNeedle = group.subjectContains?.toLowerCase() ?? "";
    const toNeedle = group.toContains?.toLowerCase() ?? "";
    const fromOk =
      !fromNeedle ||
      this.fieldMatchesAlternatives(message.fromAddress, fromNeedle);
    const subjectOk =
      !subjectNeedle ||
      this.fieldMatchesAlternatives(message.subject, subjectNeedle);
    const toList = message.toRecipients ?? [];
    const toOk =
      !toNeedle ||
      toList.some((addr) => this.fieldMatchesAlternatives(addr, toNeedle));
    const hasAttachment = (message.attachments?.length ?? 0) > 0;
    if (group.matchAny) {
      const parts: boolean[] = [];
      if (fromNeedle) parts.push(fromOk);
      if (subjectNeedle) parts.push(subjectOk);
      if (toNeedle) parts.push(toOk);
      if (group.requireAttachment) parts.push(hasAttachment);
      return parts.length > 0 && parts.some(Boolean);
    }
    const attachmentOk = !group.requireAttachment || hasAttachment;
    return fromOk && subjectOk && toOk && attachmentOk;
  }

  private fieldMatchesAlternatives(haystack: string, needle: string): boolean {
    const lowerHay = haystack.toLowerCase();
    if (needle.includes("|")) {
      return needle
        .split("|")
        .map((part) => part.trim())
        .filter((part) => part.length > 0)
        .some((part) => lowerHay.includes(part));
    }
    return lowerHay.includes(needle);
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
      toContains: row.toContains,
      requireAttachment: row.requireAttachment,
      matchAnyCondition: row.matchAnyCondition,
      conditionGroups: parseConditionGroupsJson(row.conditionGroupsJson),
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
