import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import type { MessageAttachmentMeta } from "../../infrastructure/database/entities/MessageEntity";

export type MessagingAttachmentInput = {
  filename: string;
  contentType: string;
  contentBase64: string;
};

@Injectable()
export class MessagingAttachmentStorageService {
  private static readonly maxAttachments = 5;
  private static readonly maxBytes = 10_000_000;

  public async persistForMessage(
    threadId: string,
    messageId: string,
    inputs: MessagingAttachmentInput[] | undefined,
  ): Promise<MessageAttachmentMeta[] | null> {
    if (!inputs || inputs.length === 0) {
      return null;
    }
    if (inputs.length > MessagingAttachmentStorageService.maxAttachments) {
      throw new BadRequestException(
        `En fazla ${MessagingAttachmentStorageService.maxAttachments} ek.`,
      );
    }
    const root = this.resolveRoot();
    const dir = join(root, threadId, messageId);
    await mkdir(dir, { recursive: true });
    const metas: MessageAttachmentMeta[] = [];
    for (let index = 0; index < inputs.length; index += 1) {
      const item = inputs[index];
      const filename = this.sanitizeFilename(item.filename);
      const contentType = item.contentType?.trim() || "application/octet-stream";
      if (!this.isAllowedContentType(contentType)) {
        throw new BadRequestException(`Desteklenmeyen dosya türü: ${contentType}`);
      }
      const content = Buffer.from(item.contentBase64, "base64");
      if (content.length === 0) {
        throw new BadRequestException("Boş ek dosyası.");
      }
      if (content.length > MessagingAttachmentStorageService.maxBytes) {
        throw new BadRequestException("Ek dosya boyutu sınırı aşıldı (2,5 MB).");
      }
      const storagePath = join(dir, `${index}-${randomUUID()}-${filename}`);
      await writeFile(storagePath, content);
      metas.push({
        index,
        filename,
        contentType,
        sizeBytes: content.length,
        storagePath,
      });
    }
    return metas;
  }

  public async readAttachment(
    threadId: string,
    messageId: string,
    meta: MessageAttachmentMeta,
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
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
    return false;
  }
}
