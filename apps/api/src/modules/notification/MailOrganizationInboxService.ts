import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { readFileSync } from "node:fs";
import { In, IsNull, Repository } from "typeorm";
import { MailMailboxEntity } from "../../infrastructure/database/entities/MailMailboxEntity";
import { MailInboundMessageEntity } from "../../infrastructure/database/entities/MailInboundMessageEntity";
import { MailSenderIdentityEntity } from "../../infrastructure/database/entities/MailSenderIdentityEntity";

@Injectable()
export class MailOrganizationInboxService {
  public constructor(
    @InjectRepository(MailMailboxEntity)
    private readonly mailboxRepository: Repository<MailMailboxEntity>,
    @InjectRepository(MailInboundMessageEntity)
    private readonly inboundRepository: Repository<MailInboundMessageEntity>,
    @InjectRepository(MailSenderIdentityEntity)
    private readonly senderRepository: Repository<MailSenderIdentityEntity>,
  ) {}

  public async getSummary(organizationId: string): Promise<{
    primaryAddress: string | null;
    mailboxId: string | null;
    unreadCount: number;
    totalMessages: number;
  }> {
    const primaryAddress = await this.resolvePrimaryAddress(organizationId);
    const mailbox = primaryAddress
      ? await this.mailboxRepository.findOne({
          where: { organizationId, emailAddress: primaryAddress },
        })
      : null;
    if (!mailbox) {
      return {
        primaryAddress,
        mailboxId: null,
        unreadCount: 0,
        totalMessages: 0,
      };
    }
    const [totalMessages, unreadCount] = await Promise.all([
      this.inboundRepository.count({ where: { mailboxId: mailbox.id } }),
      this.inboundRepository.count({
        where: { mailboxId: mailbox.id, readAt: IsNull() },
      }),
    ]);
    return {
      primaryAddress,
      mailboxId: mailbox.id,
      unreadCount,
      totalMessages,
    };
  }

  public async listMessages(
    organizationId: string,
    limit = 50,
  ): Promise<
    {
      id: string;
      fromAddress: string;
      subject: string;
      snippet: string | null;
      receivedAt: string;
      readAt: string | null;
    }[]
  > {
    const mailboxIds = await this.mailboxIdsForOrganization(organizationId);
    if (mailboxIds.length === 0) {
      return [];
    }
    const rows = await this.inboundRepository.find({
      where: { mailboxId: In(mailboxIds) },
      order: { receivedAt: "DESC" },
      take: limit,
    });
    return rows.map((row) => this.toListRow(row));
  }

  public async getMessage(
    organizationId: string,
    messageId: string,
  ): Promise<{
    id: string;
    fromAddress: string;
    subject: string;
    snippet: string | null;
    bodyText: string | null;
    receivedAt: string;
    readAt: string | null;
    emailAddress: string;
  }> {
    const row = await this.inboundRepository.findOne({
      where: { id: messageId },
    });
    if (!row) {
      throw new NotFoundException("Mesaj bulunamadı");
    }
    const mailbox = await this.mailboxRepository.findOne({
      where: { id: row.mailboxId },
    });
    if (!mailbox || mailbox.organizationId !== organizationId) {
      throw new ForbiddenException("Bu mesaja erişim yok");
    }
    let bodyText = row.bodyText;
    if (!bodyText && row.rawMimePath) {
      try {
        bodyText = readFileSync(row.rawMimePath, "utf8").slice(0, 200_000);
      } catch {
        bodyText = row.snippet;
      }
    }
    return {
      id: row.id,
      fromAddress: row.fromAddress,
      subject: row.subject,
      snippet: row.snippet,
      bodyText: bodyText ?? row.snippet,
      receivedAt: row.receivedAt.toISOString(),
      readAt: row.readAt?.toISOString() ?? null,
      emailAddress: mailbox.emailAddress,
    };
  }

  public async markRead(
    organizationId: string,
    messageId: string,
  ): Promise<void> {
    const row = await this.inboundRepository.findOne({
      where: { id: messageId },
    });
    if (!row) {
      throw new NotFoundException("Mesaj bulunamadı");
    }
    const mailbox = await this.mailboxRepository.findOne({
      where: { id: row.mailboxId },
    });
    if (!mailbox || mailbox.organizationId !== organizationId) {
      throw new ForbiddenException("Bu mesaja erişim yok");
    }
    if (!row.readAt) {
      row.readAt = new Date();
      await this.inboundRepository.save(row);
    }
  }

  private async mailboxIdsForOrganization(
    organizationId: string,
  ): Promise<string[]> {
    const mailboxes = await this.mailboxRepository.find({
      where: { organizationId },
    });
    return mailboxes.map((m) => m.id);
  }

  private async resolvePrimaryAddress(
    organizationId: string,
  ): Promise<string | null> {
    const sender = await this.senderRepository.findOne({
      where: { organizationId, isDefault: true },
      relations: { mailDomain: true },
    });
    if (!sender?.mailDomain) {
      return null;
    }
    return `${sender.localPart}@${sender.mailDomain.domain}`;
  }

  private toListRow(row: MailInboundMessageEntity) {
    return {
      id: row.id,
      fromAddress: row.fromAddress,
      subject: row.subject,
      snippet: row.snippet,
      receivedAt: row.receivedAt.toISOString(),
      readAt: row.readAt?.toISOString() ?? null,
    };
  }
}
