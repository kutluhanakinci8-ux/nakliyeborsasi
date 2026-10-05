import { BadRequestException, Injectable } from "@nestjs/common";
import { RedisConnectionProvider } from "../../infrastructure/redis/RedisConnectionProvider";
import { messagingAttachmentCompanyMonthlyQuotaBytes } from "./messagingAttachmentStorageConfig";

@Injectable()
export class MessagingAttachmentQuotaService {
  public constructor(
    private readonly redisConnectionProvider: RedisConnectionProvider,
  ) {}

  public async preflightCompanyMonthlyQuota(
    companyId: string,
    additionalBytes: number,
  ): Promise<void> {
    await this.enforceQuota(companyId, additionalBytes, "preflight");
  }

  public async recordCompanyMonthlyQuota(
    companyId: string,
    additionalBytes: number,
  ): Promise<void> {
    await this.enforceQuota(companyId, additionalBytes, "record");
  }

  private async enforceQuota(
    companyId: string,
    additionalBytes: number,
    mode: "preflight" | "record",
  ): Promise<void> {
    const quota = messagingAttachmentCompanyMonthlyQuotaBytes();
    if (quota <= 0 || additionalBytes <= 0) {
      return;
    }
    const key = this.monthlyKey(companyId);
    try {
      const client = this.redisConnectionProvider.getClient();
      if (mode === "preflight") {
        const raw = await client.get(key);
        const current = raw ? Number.parseInt(raw, 10) : 0;
        const used = Number.isFinite(current) ? current : 0;
        if (used + additionalBytes > quota) {
          throw new BadRequestException(
            "Aylık mesaj ek kotası aşıldı; yöneticinizle görüşün veya daha küçük dosya gönderin.",
          );
        }
        return;
      }
      const next = await client.incrby(key, additionalBytes);
      if (next === additionalBytes) {
        await client.expire(key, 60 * 60 * 24 * 45);
      }
      if (next > quota) {
        await client.decrby(key, additionalBytes);
        throw new BadRequestException(
          "Aylık mesaj ek kotası aşıldı; yöneticinizle görüşün veya daha küçük dosya gönderin.",
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Redis yoksa kotayı zorlamayız (yerel disk / S3 yine çalışır).
    }
  }

  private monthlyKey(companyId: string): string {
    const now = new Date();
    const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    return `messaging:attach-quota:${companyId}:${month}`;
  }
}
