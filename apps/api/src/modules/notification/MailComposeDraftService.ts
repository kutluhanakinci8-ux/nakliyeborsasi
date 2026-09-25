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
import { MailOrganizationStorageService } from "./MailOrganizationStorageService";

@Injectable()
export class MailComposeDraftService {
  private static readonly maxDraftsPerUser = 25;
  private static readonly maxAttachments = 3;

  public constructor(
    @InjectRepository(MailComposeDraftEntity)
    private readonly draftRepository: Repository<MailComposeDraftEntity>,
    private readonly mailOrganizationStorageService: MailOrganizationStorageService,
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
    const attachments = await this.parseAttachments(
      organizationId,
      body.attachments,
    );
    await this.assertDraftStorage(organizationId, body.text ?? "", attachments);
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
    const bytesBefore = this.estimateDraftBytes(row.bodyText ?? "", row.attachments);
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
      row.attachments = await this.parseAttachments(
        organizationId,
        body.attachments,
      );
    }
    const bytesAfter = this.estimateDraftBytes(row.bodyText ?? "", row.attachments);
    const delta = bytesAfter - bytesBefore;
    if (delta > 0) {
      await this.mailOrganizationStorageService.assertCanStore(
        organizationId,
        delta,
      );
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

  private estimateDraftBytes(
    text: string,
    attachments: MailComposeDraftAttachmentMeta[] | null,
  ): number {
    const attachmentBytes =
      attachments?.reduce((sum, file) => {
        const decoded = Buffer.from(file.contentBase64, "base64");
        return sum + decoded.length;
      }, 0) ?? 0;
    return text.length + attachmentBytes;
  }

  private async assertDraftStorage(
    organizationId: string,
    text: string,
    attachments: MailComposeDraftAttachmentMeta[] | null,
  ): Promise<void> {
    await this.mailOrganizationStorageService.assertCanStore(
      organizationId,
      this.estimateDraftBytes(text, attachments),
    );
  }

  private async parseAttachments(
    organizationId: string,
    attachments?: ComposeAttachmentInput[],
  ): Promise<MailComposeDraftAttachmentMeta[] | null> {
    if (!attachments?.length) {
      return null;
    }
    if (attachments.length > MailComposeDraftService.maxAttachments) {
      throw new BadRequestException(
        `En fazla ${MailComposeDraftService.maxAttachments} ek.`,
      );
    }
    const maxBytes =
      await this.mailOrganizationStorageService.resolveMaxAttachmentBytes(
        organizationId,
      );
    const maxMb = Math.max(1, Math.round(maxBytes / (1024 * 1024)));
    return attachments.map((item) => {
      const content = Buffer.from(item.contentBase64, "base64");
      if (content.length > maxBytes) {
        throw new BadRequestException(
          `Ek dosya plan limitini aşıyor (${maxMb} MB).`,
        );
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
