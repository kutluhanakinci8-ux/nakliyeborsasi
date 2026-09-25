import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailInboxPreferencesEntity } from "../../infrastructure/database/entities/MailInboxPreferencesEntity";

export type MailInboxPreferencesDto = {
  dailyDigestEnabled: boolean;
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
    return {
      dailyDigestEnabled: row?.dailyDigestEnabled ?? true,
    };
  }

  public async update(
    organizationId: string,
    input: { dailyDigestEnabled?: boolean },
  ): Promise<MailInboxPreferencesDto> {
    let row = await this.preferencesRepository.findOne({
      where: { organizationId },
    });
    if (!row) {
      row = this.preferencesRepository.create({
        organizationId,
        dailyDigestEnabled: true,
        lastDigestSentOn: null,
      });
    }
    if (input.dailyDigestEnabled !== undefined) {
      row.dailyDigestEnabled = Boolean(input.dailyDigestEnabled);
    }
    await this.preferencesRepository.save(row);
    return this.get(organizationId);
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
