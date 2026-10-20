import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailWebhookDeliveryLogEntity } from "../../infrastructure/database/entities/MailWebhookDeliveryLogEntity";

@Injectable()
export class MailWebhookDeliveryLogService {
  public constructor(
    @InjectRepository(MailWebhookDeliveryLogEntity)
    private readonly logRepository: Repository<MailWebhookDeliveryLogEntity>,
  ) {}

  public async recordAttempt(params: {
    organizationId: string;
    webhookEndpointId: string;
    eventType: string;
    deliveryId: string;
    attempt: number;
    httpStatus: number | null;
    success: boolean;
    errorMessage?: string | null;
  }): Promise<void> {
    try {
      await this.logRepository.save(
        this.logRepository.create({
          organizationId: params.organizationId,
          webhookEndpointId: params.webhookEndpointId,
          eventType: params.eventType,
          deliveryId: params.deliveryId,
          attempt: params.attempt,
          httpStatus: params.httpStatus,
          success: params.success,
          errorMessage: params.errorMessage?.slice(0, 500) ?? null,
        }),
      );
    } catch {
      // Log yazımı webhook gönderimini engellemez.
    }
  }

  public async listForOrganization(organizationId: string, limit = 40) {
    const rows = await this.logRepository.find({
      where: { organizationId },
      order: { createdAt: "DESC" },
      take: Math.min(100, Math.max(1, limit)),
    });
    return rows.map((row) => ({
      id: row.id,
      webhookEndpointId: row.webhookEndpointId,
      eventType: row.eventType,
      deliveryId: row.deliveryId,
      attempt: row.attempt,
      httpStatus: row.httpStatus,
      success: row.success,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt.toISOString(),
    }));
  }
}
