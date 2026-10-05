import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import type { MessageAttachmentMeta } from "../../infrastructure/database/entities/MessageEntity";
import { MessagingAttachmentQuotaService } from "./MessagingAttachmentQuotaService";
import { MessagingAttachmentS3Store } from "./MessagingAttachmentS3Store";
import {
  MESSAGING_ATTACHMENT_S3_SCHEME,
  messagingAttachmentLocalMaxBytes,
  messagingAttachmentMaxBytesPublic,
  messagingAttachmentS3MaxBytes,
  resolveMessagingAttachmentS3Config,
} from "./messagingAttachmentStorageConfig";

export type MessagingAttachmentInput = {
  filename: string;
  contentType: string;
  contentBase64: string;
};

export type PersistAttachmentsOptions = {
  companyId?: string;
};

@Injectable()
export class MessagingAttachmentStorageService {
  private static readonly maxAttachments = 5;

  public constructor(
    private readonly attachmentQuotaService: MessagingAttachmentQuotaService,
  ) {}

  public static maxAttachmentsPublic(): number {
    return MessagingAttachmentStorageService.maxAttachments;
  }

  public static maxBytesPublic(): number {
    return messagingAttachmentMaxBytesPublic();
  }

  public static allowedContentTypesPublic(): string[] {
    return [
      "application/pdf",
      "text/plain",
      "image/*",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
  }

  public async persistForMessage(
    threadId: string,
    messageId: string,
    inputs: MessagingAttachmentInput[] | undefined,
    options?: PersistAttachmentsOptions,
  ): Promise<MessageAttachmentMeta[] | null> {
    if (!inputs || inputs.length === 0) {
      return null;
    }
    if (inputs.length > MessagingAttachmentStorageService.maxAttachments) {
      throw new BadRequestException(
        `En fazla ${MessagingAttachmentStorageService.maxAttachments} ek.`,
      );
    }
    const s3Config = resolveMessagingAttachmentS3Config();
    const s3Store = s3Config ? new MessagingAttachmentS3Store(s3Config) : null;
    const localMax = messagingAttachmentLocalMaxBytes();
    const s3Max = messagingAttachmentS3MaxBytes();
    const root = this.resolveRoot();
    const dir = join(root, threadId, messageId);
    await mkdir(dir, { recursive: true });
    const prepared: Array<{
      filename: string;
      contentType: string;
      content: Buffer;
    }> = [];
    let totalBytes = 0;
    for (const item of inputs) {
      const filename = this.sanitizeFilename(item.filename);
      const contentType = item.contentType?.trim() || "application/octet-stream";
      if (!this.isAllowedContentType(contentType)) {
        throw new BadRequestException(`Desteklenmeyen dosya türü: ${contentType}`);
      }
      const content = Buffer.from(item.contentBase64, "base64");
      if (content.length === 0) {
        throw new BadRequestException("Boş ek dosyası.");
      }
      totalBytes += content.length;
      prepared.push({ filename, contentType, content });
    }
    if (options?.companyId && totalBytes > 0) {
      await this.attachmentQuotaService.preflightCompanyMonthlyQuota(
        options.companyId,
        totalBytes,
      );
    }
    const metas: MessageAttachmentMeta[] = [];
    for (let index = 0; index < prepared.length; index += 1) {
      const { filename, contentType, content } = prepared[index];
      if (content.length > s3Max) {
        throw new BadRequestException(
          `Ek dosya boyutu sınırı aşıldı (${Math.round(s3Max / 1_000_000)} MB).`,
        );
      }
      const useS3 = Boolean(s3Store && content.length > localMax);
      if (content.length > localMax && !s3Store) {
        throw new BadRequestException(
          "10 MB üzeri ekler için S3 yapılandırması gerekir (MESSAGING_ATTACHMENT_S3_BUCKET).",
        );
      }

      let storagePath: string;
      if (useS3 && s3Store && s3Config) {
        const key = this.buildS3Key(
          options?.companyId ?? "unknown",
          threadId,
          messageId,
          index,
          filename,
        );
        await s3Store.putObject({ key, body: content, contentType });
        storagePath = `${MESSAGING_ATTACHMENT_S3_SCHEME}${s3Config.bucket}/${key}`;
      } else {
        storagePath = join(dir, `${index}-${randomUUID()}-${filename}`);
        await writeFile(storagePath, content);
      }
      metas.push({
        index,
        filename,
        contentType,
        sizeBytes: content.length,
        storagePath,
      });
    }
    if (options?.companyId && totalBytes > 0) {
      await this.attachmentQuotaService.recordCompanyMonthlyQuota(
        options.companyId,
        totalBytes,
      );
    }
    return metas;
  }

  public async readAttachment(
    threadId: string,
    messageId: string,
    meta: MessageAttachmentMeta,
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    if (meta.storagePath.startsWith(MESSAGING_ATTACHMENT_S3_SCHEME)) {
      return this.readS3Attachment(threadId, messageId, meta);
    }
    const root = this.resolveRoot();
    const normalizedRoot = root.replace(/\\/g, "/");
    const normalizedPath = meta.storagePath.replace(/\\/g, "/");
    if (!normalizedPath.startsWith(`${normalizedRoot}/`)) {
      throw new NotFoundException("Ek dosyası bulunamadı.");
    }
    const expectedSegment = `/${threadId}/${messageId}/`;
    if (!normalizedPath.includes(expectedSegment)) {
      throw new NotFoundException("Ek dosyası bulunamadı.");
    }
    try {
      const buffer = await readFile(meta.storagePath);
      return {
        buffer,
        contentType: meta.contentType,
        filename: meta.filename,
      };
    } catch {
      throw new NotFoundException("Ek dosyası bulunamadı.");
    }
  }

  private async readS3Attachment(
    threadId: string,
    messageId: string,
    meta: MessageAttachmentMeta,
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    const s3Config = resolveMessagingAttachmentS3Config();
    if (!s3Config) {
      throw new NotFoundException("Ek dosyası bulunamadı.");
    }
    const parsed = this.parseS3StoragePath(meta.storagePath);
    if (!parsed || parsed.bucket !== s3Config.bucket) {
      throw new NotFoundException("Ek dosyası bulunamadı.");
    }
    const expectedSegment = `/${threadId}/${messageId}/`;
    if (!parsed.key.includes(expectedSegment)) {
      throw new NotFoundException("Ek dosyası bulunamadı.");
    }
    const store = new MessagingAttachmentS3Store(s3Config);
    const buffer = await store.getObject(parsed.key);
    return {
      buffer,
      contentType: meta.contentType,
      filename: meta.filename,
    };
  }

  private parseS3StoragePath(
    storagePath: string,
  ): { bucket: string; key: string } | null {
    if (!storagePath.startsWith(MESSAGING_ATTACHMENT_S3_SCHEME)) {
      return null;
    }
    const rest = storagePath.slice(MESSAGING_ATTACHMENT_S3_SCHEME.length);
    const slash = rest.indexOf("/");
    if (slash <= 0) {
      return null;
    }
    return {
      bucket: rest.slice(0, slash),
      key: rest.slice(slash + 1),
    };
  }

  private buildS3Key(
    companyId: string,
    threadId: string,
    messageId: string,
    index: number,
    filename: string,
  ): string {
    return `attachments/${companyId}/${threadId}/${messageId}/${index}-${randomUUID()}-${filename}`;
  }

  private resolveRoot(): string {
    const configured =
      process.env.MESSAGING_ATTACHMENT_ROOT?.trim() ??
      join(process.cwd(), "data", "messaging-attachments");
    return configured;
  }

  private sanitizeFilename(name: string): string {
    const base = name.replace(/[/\\]/g, "").trim() || "dosya";
    return base.slice(0, 180);
  }

  private isAllowedContentType(contentType: string): boolean {
    const lower = contentType.toLowerCase();
    if (lower === "application/pdf") {
      return true;
    }
    if (lower === "text/plain") {
      return true;
    }
    if (lower.startsWith("image/")) {
      return true;
    }
    if (lower.startsWith("video/") || lower.startsWith("audio/")) {
      return true;
    }
    if (lower === "application/octet-stream") {
      return true;
    }
    if (
      lower ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      lower === "application/vnd.ms-excel"
    ) {
      return true;
    }
    return false;
  }
}
