import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { MailWebhookEventType } from "../../infrastructure/database/entities/MailOrganizationWebhookEndpointEntity";
import { MailOrganizationIntegrationService } from "./MailOrganizationIntegrationService";
import { MailWebhookDeliveryLogService } from "./MailWebhookDeliveryLogService";
import { signWebhookPayload } from "./MailIntegrationCrypto";

const WEBHOOK_MAX_ATTEMPTS = 3;
const WEBHOOK_RETRY_DELAYS_MS = [0, 2000, 5000];

@Injectable()
export class MailOrganizationWebhookDispatcherService {
  private readonly logger = new Logger(MailOrganizationWebhookDispatcherService.name);

  public constructor(
    private readonly mailOrganizationIntegrationService: MailOrganizationIntegrationService,
    private readonly mailWebhookDeliveryLogService: MailWebhookDeliveryLogService,
  ) {}

  public dispatch(
    organizationId: string,
    event: MailWebhookEventType,
    data: Record<string, unknown>,
  ): void {
    void this.deliver(organizationId, event, data).catch((error) => {
      this.logger.warn(
        `Webhook dispatch failed org=${organizationId} event=${event}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });
  }

  private async deliver(
    organizationId: string,
    event: MailWebhookEventType,
    data: Record<string, unknown>,
  ): Promise<void> {
    const endpoints =
      await this.mailOrganizationIntegrationService.listEnabledWebhooksForEvent(
        organizationId,
        event,
      );
    if (!endpoints.length) {
      return;
    }
    const envelope = {
      id: randomUUID(),
      type: event,
      createdAt: new Date().toISOString(),
      data,
    };
    const rawBody = JSON.stringify(envelope);
    const timestamp = Math.floor(Date.now() / 1000).toString();

    await Promise.all(
      endpoints.map((endpoint) =>
        this.postWithRetries(
          organizationId,
          endpoint.id,
          endpoint.url,
          endpoint.signingSecret,
          {
            event,
            timestamp,
            rawBody,
            deliveryId: envelope.id,
          },
        ),
      ),
    );
  }

  private async postWithRetries(
    organizationId: string,
    endpointId: string,
    url: string,
    signingSecret: string,
    params: {
      event: MailWebhookEventType;
      timestamp: string;
      rawBody: string;
      deliveryId: string;
    },
  ): Promise<void> {
    const signature = signWebhookPayload(
      signingSecret,
      params.timestamp,
      params.rawBody,
    );
    const headers = {
      "content-type": "application/json",
      "x-lerta-mail-event": params.event,
      "x-lerta-mail-timestamp": params.timestamp,
      "x-lerta-mail-signature": signature,
    };
    for (let attempt = 0; attempt < WEBHOOK_MAX_ATTEMPTS; attempt += 1) {
      const delay = WEBHOOK_RETRY_DELAYS_MS[attempt] ?? 5000;
      if (delay > 0) {
        await sleep(delay);
      }
      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: params.rawBody,
          signal: AbortSignal.timeout(15_000),
        });
        const ok = response.ok;
        await this.mailWebhookDeliveryLogService.recordAttempt({
          organizationId,
          webhookEndpointId: endpointId,
          eventType: params.event,
          deliveryId: params.deliveryId,
          attempt: attempt + 1,
          httpStatus: response.status,
          success: ok,
          errorMessage: ok ? null : `HTTP ${response.status}`,
        });
        if (ok) {
          return;
        }
        this.logger.warn(
          `Webhook ${endpointId} HTTP ${response.status} (${params.event}) attempt=${attempt + 1}`,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        await this.mailWebhookDeliveryLogService.recordAttempt({
          organizationId,
          webhookEndpointId: endpointId,
          eventType: params.event,
          deliveryId: params.deliveryId,
          attempt: attempt + 1,
          httpStatus: null,
          success: false,
          errorMessage: message,
        });
        this.logger.warn(
          `Webhook ${endpointId} request failed (${params.event}) attempt=${attempt + 1}: ${message}`,
        );
      }
    }
    this.logger.warn(
      `Webhook ${endpointId} exhausted retries (${params.event})`,
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
