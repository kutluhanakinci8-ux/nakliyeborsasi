import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailInboxPreferencesEntity } from "../../infrastructure/database/entities/MailInboxPreferencesEntity";

export type MailInboxListDensity = "comfortable" | "compact";

export type MailInboxPreferencesDto = {
  dailyDigestEnabled: boolean;
  autoReplyEnabled: boolean;
  autoReplyBodyText: string | null;
  autoReplyActiveFrom: string | null;
  autoReplyActiveUntil: string | null;
  inboxListDensity: MailInboxListDensity;
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
