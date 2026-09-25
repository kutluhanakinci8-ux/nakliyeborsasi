import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Repository } from "typeorm";
import { MailCustomFolderEntity } from "../../infrastructure/database/entities/MailCustomFolderEntity";
import { MailInboundMessageEntity } from "../../infrastructure/database/entities/MailInboundMessageEntity";
import { MailInboxRuleEntity } from "../../infrastructure/database/entities/MailInboxRuleEntity";
import { MailMailboxEntity } from "../../infrastructure/database/entities/MailMailboxEntity";

const MAX_FOLDERS_PER_ORG = 25;

export type MailCustomFolderRow = {
  id: string;
  name: string;
  sortOrder: number;
  messageCount: number;
  createdAt: string;
};

@Injectable()
export class MailCustomFolderService {
  public constructor(
    @InjectRepository(MailCustomFolderEntity)
    private readonly folderRepository: Repository<MailCustomFolderEntity>,
    @InjectRepository(MailInboundMessageEntity)
    private readonly inboundRepository: Repository<MailInboundMessageEntity>,
    @InjectRepository(MailMailboxEntity)
    private readonly mailboxRepository: Repository<MailMailboxEntity>,
    @InjectRepository(MailInboxRuleEntity)
    private readonly ruleRepository: Repository<MailInboxRuleEntity>,
  ) {}

  public async listForOrganization(
    organizationId: string,
  ): Promise<MailCustomFolderRow[]> {
    const folders = await this.folderRepository.find({
      where: { organizationId },
      order: { sortOrder: "ASC", name: "ASC" },
    });
    const mailboxIds = await this.mailboxIds(organizationId);
    if (mailboxIds.length === 0 || folders.length === 0) {
      return folders.map((f) => this.toRow(f, 0));
    }
    const counts = await this.inboundRepository
      .createQueryBuilder("m")
      .select("m.customFolderId", "folderId")
      .addSelect("COUNT(*)", "cnt")
      .where("m.mailboxId IN (:...mailboxIds)", { mailboxIds })
      .andWhere("m.mailboxFolder = :inbox", { inbox: "inbox" })
      .andWhere("m.spamStatus IN (:...spam)", { spam: ["clean", "suspected"] })
      .andWhere("m.customFolderId IS NOT NULL")
      .groupBy("m.customFolderId")
      .getRawMany<{ folderId: string; cnt: string }>();
    const countById = new Map(
      counts.map((row) => [row.folderId, Number(row.cnt)]),
    );
    return folders.map((f) => this.toRow(f, countById.get(f.id) ?? 0));
  }

  public async create(
    organizationId: string,
    name: string,
  ): Promise<MailCustomFolderRow> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException("Klasör adı gerekli.");
    }
    const existing = await this.folderRepository.count({
      where: { organizationId },
    });
    if (existing >= MAX_FOLDERS_PER_ORG) {
      throw new BadRequestException(
        `En fazla ${MAX_FOLDERS_PER_ORG} özel klasör oluşturulabilir.`,
      );
    }
    const row = await this.folderRepository.save(
      this.folderRepository.create({
        organizationId,
        name: trimmed,
        sortOrder: existing,
      }),
    );
    return this.toRow(row, 0);
  }

  public async updateName(
    organizationId: string,
    folderId: string,
    name: string,
  ): Promise<MailCustomFolderRow> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException("Klasör adı gerekli.");
    }
    const row = await this.assertFolder(organizationId, folderId);
    row.name = trimmed;
    await this.folderRepository.save(row);
    const count = await this.countMessagesInFolder(organizationId, folderId);
    return this.toRow(row, count);
  }

  public async remove(organizationId: string, folderId: string): Promise<void> {
    await this.assertFolder(organizationId, folderId);
    await this.ruleRepository.update(
      { organizationId, actionCustomFolderId: folderId },
      { actionCustomFolderId: null },
    );
    const mailboxIds = await this.mailboxIds(organizationId);
    if (mailboxIds.length > 0) {
      await this.inboundRepository.update(
        {
          mailboxId: In(mailboxIds),
          customFolderId: folderId,
        },
        { customFolderId: null },
      );
    }
    await this.folderRepository.delete({ id: folderId, organizationId });
  }

  public async assertFolder(
    organizationId: string,
    folderId: string,
  ): Promise<MailCustomFolderEntity> {
    const row = await this.folderRepository.findOne({
      where: { id: folderId, organizationId },
    });
    if (!row) {
      throw new NotFoundException("Klasör bulunamadı.");
    }
    return row;
  }

  public async setMessageFolder(
    organizationId: string,
    messageId: string,
    customFolderId: string | null,
  ): Promise<void> {
    if (customFolderId) {
      await this.assertFolder(organizationId, customFolderId);
    }
    const row = await this.inboundRepository.findOne({
      where: { id: messageId },
    });
    if (!row) {
      throw new NotFoundException("Mesaj bulunamadı.");
    }
    const mailbox = await this.mailboxRepository.findOne({
      where: { id: row.mailboxId },
    });
    if (!mailbox || mailbox.organizationId !== organizationId) {
      throw new NotFoundException("Mesaj bulunamadı.");
    }
    if (row.mailboxFolder === "trash") {
      throw new BadRequestException("Çöpteki mesaj klasörlenemez.");
    }
    row.customFolderId = customFolderId;
    await this.inboundRepository.save(row);
  }

  public async bulkSetMessageFolder(
    organizationId: string,
    messageIds: string[],
    customFolderId: string | null,
  ): Promise<{ updated: number }> {
    let updated = 0;
    for (const messageId of messageIds) {
      await this.setMessageFolder(organizationId, messageId, customFolderId);
      updated += 1;
    }
    return { updated };
  }

  private async countMessagesInFolder(
    organizationId: string,
    folderId: string,
  ): Promise<number> {
    const mailboxIds = await this.mailboxIds(organizationId);
    if (mailboxIds.length === 0) {
      return 0;
    }
    return this.inboundRepository.count({
      where: {
        mailboxId: In(mailboxIds),
        customFolderId: folderId,
        mailboxFolder: "inbox",
        spamStatus: In(["clean", "suspected"]),
      },
    });
  }

  private async mailboxIds(organizationId: string): Promise<string[]> {
    const mailboxes = await this.mailboxRepository.find({
      where: { organizationId },
    });
    return mailboxes.map((m) => m.id);
  }

  private toRow(
    row: MailCustomFolderEntity,
    messageCount: number,
  ): MailCustomFolderRow {
    return {
      id: row.id,
      name: row.name,
      sortOrder: row.sortOrder,
      messageCount,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
