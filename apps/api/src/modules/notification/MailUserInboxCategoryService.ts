import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { MailUserInboxCategoryEntity } from "../../infrastructure/database/entities/MailUserInboxCategoryEntity";
import { MailInboundMessageEntity } from "../../infrastructure/database/entities/MailInboundMessageEntity";
import { MailMailboxEntity } from "../../infrastructure/database/entities/MailMailboxEntity";
import {
  DEFAULT_USER_INBOX_CATEGORIES,
  normalizeUserCategoryColorKey,
  normalizeUserCategoryIconKey,
} from "./MailUserInboxCategoryCatalog";

const MAX_CATEGORIES = 24;

export type MailUserInboxCategoryRow = {
  id: string;
  name: string;
  colorKey: string;
  iconKey: string;
  sortOrder: number;
  messageCount: number;
};

@Injectable()
export class MailUserInboxCategoryService {
  public constructor(
    @InjectRepository(MailUserInboxCategoryEntity)
    private readonly categoryRepository: Repository<MailUserInboxCategoryEntity>,
    @InjectRepository(MailInboundMessageEntity)
    private readonly inboundRepository: Repository<MailInboundMessageEntity>,
    @InjectRepository(MailMailboxEntity)
    private readonly mailboxRepository: Repository<MailMailboxEntity>,
  ) {}

  public async listForOrganization(
    organizationId: string,
  ): Promise<MailUserInboxCategoryRow[]> {
    await this.ensureDefaults(organizationId);
    const categories = await this.categoryRepository.find({
      where: { organizationId },
      order: { sortOrder: "ASC", name: "ASC" },
    });
    const mailboxIds = await this.mailboxIds(organizationId);
    if (mailboxIds.length === 0 || categories.length === 0) {
      return categories.map((c) => this.toRow(c, 0));
    }
    const counts = await this.inboundRepository
      .createQueryBuilder("m")
      .select("m.userInboxCategoryId", "categoryId")
      .addSelect("COUNT(*)", "cnt")
      .where("m.mailboxId IN (:...mailboxIds)", { mailboxIds })
      .andWhere("m.userInboxCategoryId IS NOT NULL")
      .groupBy("m.userInboxCategoryId")
      .getRawMany<{ categoryId: string; cnt: string }>();
    const countById = new Map(
      counts.map((row) => [row.categoryId, Number(row.cnt)]),
    );
    return categories.map((c) => this.toRow(c, countById.get(c.id) ?? 0));
  }

  public async create(
    organizationId: string,
    input: { name: string; colorKey?: string; iconKey?: string },
  ): Promise<MailUserInboxCategoryRow> {
    const name = input.name.trim();
    if (!name) {
      throw new BadRequestException("Kategori adı gerekli.");
    }
    const count = await this.categoryRepository.count({
      where: { organizationId },
    });
    if (count >= MAX_CATEGORIES) {
      throw new BadRequestException(
        `En fazla ${MAX_CATEGORIES} kategori oluşturulabilir.`,
      );
    }
    const row = await this.categoryRepository.save(
      this.categoryRepository.create({
        organizationId,
        name,
        colorKey: normalizeUserCategoryColorKey(input.colorKey),
        iconKey: normalizeUserCategoryIconKey(input.iconKey),
        sortOrder: count,
      }),
    );
    return this.toRow(row, 0);
  }

  public async update(
    organizationId: string,
    categoryId: string,
    input: { name?: string; colorKey?: string; iconKey?: string },
  ): Promise<MailUserInboxCategoryRow> {
    const row = await this.assertCategory(organizationId, categoryId);
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) {
        throw new BadRequestException("Kategori adı gerekli.");
      }
      row.name = name;
    }
    if (input.colorKey !== undefined) {
      row.colorKey = normalizeUserCategoryColorKey(input.colorKey);
    }
    if (input.iconKey !== undefined) {
      row.iconKey = normalizeUserCategoryIconKey(input.iconKey);
    }
    await this.categoryRepository.save(row);
    const messageCount = await this.countMessagesForCategory(
      organizationId,
      row.id,
    );
    return this.toRow(row, messageCount);
  }

  public async remove(organizationId: string, categoryId: string): Promise<void> {
    await this.assertCategory(organizationId, categoryId);
    const mailboxIds = await this.mailboxIds(organizationId);
    if (mailboxIds.length > 0) {
      await this.inboundRepository.update(
        {
          mailboxId: In(mailboxIds),
          userInboxCategoryId: categoryId,
        },
        { userInboxCategoryId: null },
      );
    }
    await this.categoryRepository.delete({ id: categoryId, organizationId });
  }

  public async assertCategoryForOrg(
    organizationId: string,
    categoryId: string,
  ): Promise<MailUserInboxCategoryEntity> {
    return await this.assertCategory(organizationId, categoryId);
  }

  private async ensureDefaults(organizationId: string): Promise<void> {
    const count = await this.categoryRepository.count({
      where: { organizationId },
    });
    if (count > 0) {
      return;
    }
    await this.categoryRepository.save(
      DEFAULT_USER_INBOX_CATEGORIES.map((item, index) =>
        this.categoryRepository.create({
          organizationId,
          name: item.name,
          colorKey: item.colorKey,
          iconKey: item.iconKey,
          sortOrder: index,
        }),
      ),
    );
  }

  private async assertCategory(
    organizationId: string,
    categoryId: string,
  ): Promise<MailUserInboxCategoryEntity> {
    const row = await this.categoryRepository.findOne({
      where: { id: categoryId, organizationId },
    });
    if (!row) {
      throw new NotFoundException("Kategori bulunamadı.");
    }
    return row;
  }

  private async mailboxIds(organizationId: string): Promise<string[]> {
    const rows = await this.mailboxRepository.find({
      where: { organizationId, status: "active" },
      select: ["id"],
    });
    return rows.map((r) => r.id);
  }

  private async countMessagesForCategory(
    organizationId: string,
    categoryId: string,
  ): Promise<number> {
    const mailboxIds = await this.mailboxIds(organizationId);
    if (mailboxIds.length === 0) {
      return 0;
    }
    return await this.inboundRepository.count({
      where: {
        mailboxId: In(mailboxIds),
        userInboxCategoryId: categoryId,
      },
    });
  }

  private toRow(
    row: MailUserInboxCategoryEntity,
    messageCount: number,
  ): MailUserInboxCategoryRow {
    return {
      id: row.id,
      name: row.name,
      colorKey: row.colorKey,
      iconKey: row.iconKey,
      sortOrder: row.sortOrder,
      messageCount,
    };
  }
}
