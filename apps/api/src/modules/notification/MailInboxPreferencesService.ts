import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailInboxPreferencesEntity } from "../../infrastructure/database/entities/MailInboxPreferencesEntity";
import {
  normalizeAfterMessageAction,
  normalizeDefaultReplyMode,
  normalizeRemoteImagesPolicy,
  normalizeReplyQuoteMode,
  normalizeSwipePrimaryAction,
  normalizeUndoSendSeconds,
  type MailAfterMessageAction,
  type MailDefaultReplyMode,
  type MailRemoteImagesPolicy,
  type MailReplyQuoteMode,
  type MailSwipePrimaryAction,
  type UndoSendSeconds,
} from "./MailInboxPostaPreferenceValues";

export type MailInboxListDensity = "comfortable" | "compact";

export type MailInboxPreferencesDto = {
  dailyDigestEnabled: boolean;
  autoReplyEnabled: boolean;
  autoReplyBodyText: string | null;
  autoReplyActiveFrom: string | null;
  autoReplyActiveUntil: string | null;
  inboxListDensity: MailInboxListDensity;
  undoSendSeconds: UndoSendSeconds;
  defaultReplyMode: MailDefaultReplyMode;
  remoteImagesPolicy: MailRemoteImagesPolicy;
  afterMessageAction: MailAfterMessageAction;
  confirmPermanentDelete: boolean;
  confirmBulkDelete: boolean;
  threadViewEnabled: boolean;
  swipePrimaryAction: MailSwipePrimaryAction;
  focusedInboxEnabled: boolean;
  replyQuoteMode: MailReplyQuoteMode;
};

export type MailAutoReplyConfig = {
  enabled: boolean;
  bodyText: string | null;
  activeFrom: Date | null;
  activeUntil: Date | null;
};

@Injectable()
export class MailInboxPreferencesService {
  public constructor(
    @InjectRepository(MailInboxPreferencesEntity)
    private readonly preferencesRepository: Repository<MailInboxPreferencesEntity>,
  ) {}

  public async get(organizationId: string): Promise<MailInboxPreferencesDto> {
    const row = await this.preferencesRepository.findOne({
      where: { organizationId },
    });
    return this.toDto(row);
  }

  public async getAutoReplyConfig(
    organizationId: string,
  ): Promise<MailAutoReplyConfig> {
    const row = await this.preferencesRepository.findOne({
      where: { organizationId },
    });
    return {
      enabled: row?.autoReplyEnabled ?? false,
      bodyText: row?.autoReplyBodyText ?? null,
      activeFrom: row?.autoReplyActiveFrom ?? null,
      activeUntil: row?.autoReplyActiveUntil ?? null,
    };
  }

  public async update(
    organizationId: string,
    input: {
      dailyDigestEnabled?: boolean;
      autoReplyEnabled?: boolean;
      autoReplyBodyText?: string | null;
      autoReplyActiveFrom?: string | null;
      autoReplyActiveUntil?: string | null;
      inboxListDensity?: MailInboxListDensity;
      undoSendSeconds?: number;
      defaultReplyMode?: MailDefaultReplyMode;
      remoteImagesPolicy?: MailRemoteImagesPolicy;
      afterMessageAction?: MailAfterMessageAction;
      confirmPermanentDelete?: boolean;
      confirmBulkDelete?: boolean;
      threadViewEnabled?: boolean;
      swipePrimaryAction?: MailSwipePrimaryAction;
      focusedInboxEnabled?: boolean;
      replyQuoteMode?: MailReplyQuoteMode;
    },
  ): Promise<MailInboxPreferencesDto> {
    let row = await this.preferencesRepository.findOne({
      where: { organizationId },
    });
    if (!row) {
      row = this.preferencesRepository.create({
        organizationId,
        dailyDigestEnabled: true,
        autoReplyEnabled: false,
        autoReplyBodyText: null,
        autoReplyActiveFrom: null,
        autoReplyActiveUntil: null,
        inboxListDensity: "comfortable",
        lastDigestSentOn: null,
        undoSendSeconds: 5,
        defaultReplyMode: "reply",
        remoteImagesPolicy: "show",
        afterMessageAction: "list",
        confirmPermanentDelete: true,
        confirmBulkDelete: true,
        threadViewEnabled: false,
        swipePrimaryAction: "archive",
        focusedInboxEnabled: false,
        replyQuoteMode: "full",
      });
    }
    if (input.dailyDigestEnabled !== undefined) {
      row.dailyDigestEnabled = Boolean(input.dailyDigestEnabled);
    }
    if (input.autoReplyEnabled !== undefined) {
      row.autoReplyEnabled = Boolean(input.autoReplyEnabled);
    }
    if (input.autoReplyBodyText !== undefined) {
      const text = input.autoReplyBodyText?.trim() ?? "";
      row.autoReplyBodyText = text.length > 0 ? text.slice(0, 4000) : null;
    }
    if (input.autoReplyActiveFrom !== undefined) {
      row.autoReplyActiveFrom = this.parseOptionalDate(
        input.autoReplyActiveFrom,
      );
    }
    if (input.autoReplyActiveUntil !== undefined) {
      row.autoReplyActiveUntil = this.parseOptionalDate(
        input.autoReplyActiveUntil,
      );
    }
    if (input.inboxListDensity !== undefined) {
      row.inboxListDensity =
        input.inboxListDensity === "compact" ? "compact" : "comfortable";
    }
    if (input.undoSendSeconds !== undefined) {
      row.undoSendSeconds = normalizeUndoSendSeconds(input.undoSendSeconds);
    }
    if (input.defaultReplyMode !== undefined) {
      row.defaultReplyMode = normalizeDefaultReplyMode(input.defaultReplyMode);
    }
    if (input.remoteImagesPolicy !== undefined) {
      row.remoteImagesPolicy = normalizeRemoteImagesPolicy(
        input.remoteImagesPolicy,
      );
    }
    if (input.afterMessageAction !== undefined) {
      row.afterMessageAction = normalizeAfterMessageAction(
        input.afterMessageAction,
      );
    }
    if (input.confirmPermanentDelete !== undefined) {
      row.confirmPermanentDelete = Boolean(input.confirmPermanentDelete);
    }
    if (input.confirmBulkDelete !== undefined) {
      row.confirmBulkDelete = Boolean(input.confirmBulkDelete);
    }
    if (input.threadViewEnabled !== undefined) {
      row.threadViewEnabled = Boolean(input.threadViewEnabled);
    }
    if (input.swipePrimaryAction !== undefined) {
      row.swipePrimaryAction = normalizeSwipePrimaryAction(
        input.swipePrimaryAction,
      );
    }
    if (input.focusedInboxEnabled !== undefined) {
      row.focusedInboxEnabled = Boolean(input.focusedInboxEnabled);
    }
    if (input.replyQuoteMode !== undefined) {
      row.replyQuoteMode = normalizeReplyQuoteMode(input.replyQuoteMode);
    }
    await this.preferencesRepository.save(row);
    return this.get(organizationId);
  }

  private toDto(
    row: MailInboxPreferencesEntity | null,
  ): MailInboxPreferencesDto {
    return {
      dailyDigestEnabled: row?.dailyDigestEnabled ?? true,
      autoReplyEnabled: row?.autoReplyEnabled ?? false,
      autoReplyBodyText: row?.autoReplyBodyText ?? null,
      autoReplyActiveFrom: row?.autoReplyActiveFrom?.toISOString() ?? null,
      autoReplyActiveUntil: row?.autoReplyActiveUntil?.toISOString() ?? null,
      inboxListDensity:
        row?.inboxListDensity === "compact" ? "compact" : "comfortable",
      undoSendSeconds: normalizeUndoSendSeconds(row?.undoSendSeconds),
      defaultReplyMode: normalizeDefaultReplyMode(row?.defaultReplyMode),
      remoteImagesPolicy: normalizeRemoteImagesPolicy(row?.remoteImagesPolicy),
      afterMessageAction: normalizeAfterMessageAction(row?.afterMessageAction),
      confirmPermanentDelete: row?.confirmPermanentDelete ?? true,
      confirmBulkDelete: row?.confirmBulkDelete ?? true,
      threadViewEnabled: row?.threadViewEnabled ?? false,
      swipePrimaryAction: normalizeSwipePrimaryAction(row?.swipePrimaryAction),
      focusedInboxEnabled: row?.focusedInboxEnabled ?? false,
      replyQuoteMode: normalizeReplyQuoteMode(row?.replyQuoteMode),
    };
  }

  private parseOptionalDate(value: string | null): Date | null {
    if (!value?.trim()) {
      return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  public async getLastDigestSentOn(
    organizationId: string,
  ): Promise<string | null> {
    const row = await this.preferencesRepository.findOne({
      where: { organizationId },
    });
    return row?.lastDigestSentOn ?? null;
  }

  public async markDigestSent(
    organizationId: string,
    istanbulDate: string,
  ): Promise<void> {
    let row = await this.preferencesRepository.findOne({
      where: { organizationId },
    });
    if (!row) {
      row = this.preferencesRepository.create({
        organizationId,
        dailyDigestEnabled: true,
        autoReplyEnabled: false,
        autoReplyBodyText: null,
        autoReplyActiveFrom: null,
        autoReplyActiveUntil: null,
        inboxListDensity: "comfortable",
        lastDigestSentOn: istanbulDate,
      });
    } else {
      row.lastDigestSentOn = istanbulDate;
    }
    await this.preferencesRepository.save(row);
  }

  public async isDailyDigestEnabled(organizationId: string): Promise<boolean> {
    const row = await this.preferencesRepository.findOne({
      where: { organizationId },
    });
    return row?.dailyDigestEnabled ?? true;
  }
}
