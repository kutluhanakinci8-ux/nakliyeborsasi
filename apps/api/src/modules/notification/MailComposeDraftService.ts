import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  MailComposeDraftAttachmentMeta,
  MailComposeDraftEntity,
} from "../../infrastructure/database/entities/MailComposeDraftEntity";
import { ComposeAttachmentInput } from "./MailMailboxComposeService";

@Injectable()
export class MailComposeDraftService {
  private static readonly maxDraftsPerUser = 25;
  private static readonly maxAttachments = 3;
  private static readonly maxAttachmentBytes = 2 * 1024 * 1024;

  public constructor(
    @InjectRepository(MailComposeDraftEntity)
    private readonly draftRepository: Repository<MailComposeDraftEntity>,
  ) {}

  public async list(organizationId: string, userId: string) {
    const rows = await this.draftRepository.find({
      where: { organizationId, createdByUserId: userId },
      order: { updatedAt: "DESC" },
      take: MailComposeDraftService.maxDraftsPerUser,
    });
    return rows.map((row) => this.toDto(row));
  }

  public async create(
    organizationId: string,
    userId: string,
    body: {
      to?: string;
      subject?: string;
      text?: string;
      attachments?: ComposeAttachmentInput[];
    },
  ) {
    await this.assertDraftQuota(organizationId, userId);
    const attachments = this.parseAttachments(body.attachments);
    const row = await this.draftRepository.save(
      this.draftRepository.create({
        organizationId,
        createdByUserId: userId,
        toAddress: body.to?.trim().toLowerCase() || null,
        subject: body.subject?.trim() || null,
        bodyText: body.text ?? null,
        attachments,
      }),
    );
    return this.toDto(row);
  }

  public async update(
    organizationId: string,
    userId: string,
    draftId: string,
    body: {
      to?: string;
      subject?: string;
      text?: string;
      attachments?: ComposeAttachmentInput[];
    },
  ) {
    const row = await this.assertDraftAccess(organizationId, userId, draftId);
    if (body.to !== undefined) {
      row.toAddress = body.to.trim().toLowerCase() || null;
    }
    if (body.subject !== undefined) {
      row.subject = body.subject.trim() || null;
    }
    if (body.text !== undefined) {
      row.bodyText = body.text;
    }
    if (body.attachments !== undefined) {
      row.attachments = this.parseAttachments(body.attachments);
    }
    const saved = await this.draftRepository.save(row);
    return this.toDto(saved);
  }

  public async delete(
    organizationId: string,
    userId: string,
    draftId: string,
  ): Promise<void> {
    const row = await this.assertDraftAccess(organizationId, userId, draftId);
    await this.draftRepository.remove(row);
  }

  public async getForSend(
    organizationId: string,
    userId: string,
    draftId: string,
  ): Promise<{
    to: string;
    subject: string;
    text: string;
    attachments?: ComposeAttachmentInput[];
  }> {
    const row = await this.assertDraftAccess(organizationId, userId, draftId);
    const to = row.toAddress?.trim();
    const subject = row.subject?.trim();
    const text = row.bodyText?.trim();
    if (!to || !subject || !text) {
      throw new BadRequestException(
        "Taslak gönderilemez: kime, konu ve mesaj dolu olmalı.",
      );
    }
    return {
      to,
      subject,
      text,
      attachments: row.attachments ?? undefined,
    };
  }

  public async deleteAfterSend(
    organizationId: string,
    userId: string,
    draftId: string,
  ): Promise<void> {
    const row = await this.assertDraftAccess(organizationId, userId, draftId);
    await this.draftRepository.remove(row);
  }

  private async assertDraftQuota(
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const count = await this.draftRepository.count({
      where: { organizationId, createdByUserId: userId },
    });
    if (count >= MailComposeDraftService.maxDraftsPerUser) {
      throw new BadRequestException(
        `En fazla ${MailComposeDraftService.maxDraftsPerUser} taslak saklanabilir.`,
      );
    }
  }

  private async assertDraftAccess(
    organizationId: string,
    userId: string,
    draftId: string,
  ): Promise<MailComposeDraftEntity> {
    const row = await this.draftRepository.findOne({ where: { id: draftId } });
    if (!row) {
      throw new NotFoundException("Taslak bulunamadı");
    }
    if (row.organizationId !== organizationId) {
      throw new ForbiddenException("Bu taslağa erişim yok");
    }
    if (row.createdByUserId !== userId) {
      throw new ForbiddenException("Bu taslağa erişim yok");
    }
    return row;
  }

  private parseAttachments(
    attachments?: ComposeAttachmentInput[],
  ): MailComposeDraftAttachmentMeta[] | null {
    if (!attachments?.length) {
      return null;
    }
    if (attachments.length > MailComposeDraftService.maxAttachments) {
      throw new BadRequestException(
        `En fazla ${MailComposeDraftService.maxAttachments} ek.`,
      );
    }
    return attachments.map((item) => {
      const content = Buffer.from(item.contentBase64, "base64");
      if (content.length > MailComposeDraftService.maxAttachmentBytes) {
        throw new BadRequestException("Ek dosya 2 MB sınırını aşıyor.");
      }
      return {
        filename: item.filename,
        contentType: item.contentType,
        contentBase64: item.contentBase64,
      };
    });
  }

  private toDto(row: MailComposeDraftEntity) {
    return {
      id: row.id,
      to: row.toAddress,
      subject: row.subject,
      text: row.bodyText,
      attachments: row.attachments ?? [],
      updatedAt: row.updatedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    };
  }
}
