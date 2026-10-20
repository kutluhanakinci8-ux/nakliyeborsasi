import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailWebhookDeliveryLogEntity } from "../../infrastructure/database/entities/MailWebhookDeliveryLogEntity";
import { MailOrganizationIntegrationService } from "./MailOrganizationIntegrationService";
import { signWebhookPayload } from "./MailIntegrationCrypto";

@Injectable()
export class MailWebhookDeliveryLogService {
  public constructor(
    @InjectRepository(MailWebhookDeliveryLogEntity)
    private readonly logRepository: Repository<MailWebhookDeliveryLogEntity>,
    private readonly mailOrganizationIntegrationService: MailOrganizationIntegrationService,
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
    payloadBody?: string | null;
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
          payloadBody:
            params.attempt === 1 ? params.payloadBody?.slice(0, 100_000) ?? null : null,
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
      canReplay: Boolean(row.payloadBody) && !row.success,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  public async replay(organizationId: string, logId: string) {
    const row = await this.logRepository.findOne({
      where: { id: logId, organizationId },
    });
    if (!row?.payloadBody) {
      throw new NotFoundException("Yeniden gönderilebilir kayıt bulunamadı.");
    }
    const endpoint =
      await this.mailOrganizationIntegrationService.findWebhookForOrganization(
        organizationId,
        row.webhookEndpointId,
      );
    if (!endpoint || !endpoint.enabled) {
      throw new BadRequestException("Webhook uç noktası aktif değil.");
    }
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = signWebhookPayload(
      endpoint.signingSecret,
      timestamp,
      row.payloadBody,
    );
    const response = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-lerta-mail-event": row.eventType,
        "x-lerta-mail-timestamp": timestamp,
        "x-lerta-mail-signature": signature,
      },
      body: row.payloadBody,
      signal: AbortSignal.timeout(15_000),
    });
    await this.recordAttempt({
      organizationId,
      webhookEndpointId: row.webhookEndpointId,
      eventType: row.eventType,
      deliveryId: row.deliveryId,
      attempt: 1,
      httpStatus: response.status,
      success: response.ok,
      errorMessage: response.ok ? null : `replay HTTP ${response.status}`,
      payloadBody: row.payloadBody,
    });
    return {
      ok: response.ok,
      httpStatus: response.status,
    };
  }
}
