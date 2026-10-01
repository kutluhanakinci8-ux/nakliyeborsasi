import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { buildSocialHubMediaRef } from "./socialHubPublishMedia";

export type SocialHubPublishMediaMeta = {
  mediaId: string;
  companyId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
};

@Injectable()
export class SocialHubPublishMediaStorageService {
  private static readonly maxBytes = 8_000_000;
  private static readonly maxPerUpload = 4;

  public async saveUpload(params: {
    companyId: string;
    filename: string;
    contentType: string;
    contentBase64: string;
  }): Promise<{
    mediaRef: string;
    mediaId: string;
    filename: string;
    contentType: string;
    sizeBytes: number;
  }> {
    const filename = this.sanitizeFilename(params.filename);
    const contentType = params.contentType?.trim() || "application/octet-stream";
    if (!this.isAllowedContentType(contentType)) {
      throw new BadRequestException(
        "Yalnızca JPEG, PNG, GIF veya WebP görsel yükleyebilirsiniz.",
      );
    }
    const buffer = Buffer.from(params.contentBase64, "base64");
    if (buffer.length === 0) {
      throw new BadRequestException("Boş dosya.");
    }
    if (buffer.length > SocialHubPublishMediaStorageService.maxBytes) {
      throw new BadRequestException("Görsel boyutu 8 MB sınırını aşıyor.");
    }
    const mediaId = randomUUID();
    const root = this.resolveRoot();
    const companyDir = join(root, params.companyId);
    await mkdir(companyDir, { recursive: true });
    const meta: SocialHubPublishMediaMeta = {
      mediaId,
      companyId: params.companyId,
      filename,
      contentType,
      sizeBytes: buffer.length,
    };
    await writeFile(join(companyDir, `${mediaId}.bin`), buffer);
    await writeFile(
      join(companyDir, `${mediaId}.json`),
      JSON.stringify(meta),
      "utf8",
    );
    return {
      mediaRef: buildSocialHubMediaRef(mediaId),
      mediaId,
      filename,
      contentType,
      sizeBytes: buffer.length,
    };
  }

  public async readForCompany(
    companyId: string,
    mediaId: string,
  ): Promise<{ buffer: Buffer; meta: SocialHubPublishMediaMeta }> {
    const meta = await this.loadMeta(companyId, mediaId);
    const buffer = await readFile(
      join(this.resolveRoot(), companyId, `${mediaId}.bin`),
    );
    return { buffer, meta };
  }

  public async loadMeta(
    companyId: string,
    mediaId: string,
  ): Promise<SocialHubPublishMediaMeta> {
    try {
      const raw = await readFile(
        join(this.resolveRoot(), companyId, `${mediaId}.json`),
        "utf8",
      );
      const parsed = JSON.parse(raw) as SocialHubPublishMediaMeta;
      if (parsed.companyId !== companyId || parsed.mediaId !== mediaId) {
        throw new NotFoundException("Medya bulunamadı.");
      }
      return parsed;
    } catch {
      throw new NotFoundException("Medya bulunamadı.");
    }
  }

  public static maxPerUploadPublic(): number {
    return SocialHubPublishMediaStorageService.maxPerUpload;
  }

  private sanitizeFilename(name: string): string {
    const base = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
    return base || "image.jpg";
  }

  private isAllowedContentType(contentType: string): boolean {
    const lower = contentType.toLowerCase();
    return (
      lower === "image/jpeg" ||
      lower === "image/jpg" ||
      lower === "image/png" ||
      lower === "image/gif" ||
      lower === "image/webp"
    );
  }

  private resolveRoot(): string {
    const fromEnv = process.env.SOCIAL_HUB_PUBLISH_MEDIA_ROOT?.trim();
    if (fromEnv) {
      return fromEnv;
    }
    const dataRoot = process.env.LERTA_DATA_ROOT?.trim() || "/var/lib/lerta";
    return join(dataRoot, "social-hub-publish-media");
  }
}
