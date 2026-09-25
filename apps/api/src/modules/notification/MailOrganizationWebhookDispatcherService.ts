import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { MailWebhookEventType } from "../../infrastructure/database/entities/MailOrganizationWebhookEndpointEntity";
import { MailOrganizationIntegrationService } from "./MailOrganizationIntegrationService";
import { signWebhookPayload } from "./MailIntegrationCrypto";

@Injectable()
export class MailOrganizationWebhookDispatcherService {
  private readonly logger = new Logger(MailOrganizationWebhookDispatcherService.name);

  public constructor(
    private readonly mailOrganizationIntegrationService: MailOrganizationIntegrationService,
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
      endpoints.map(async (endpoint) => {
        const signature = signWebhookPayload(
          endpoint.signingSecret,
          timestamp,
          rawBody,
        );
        try {
          const response = await fetch(endpoint.url, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-lerta-mail-event": event,
              "x-lerta-mail-timestamp": timestamp,
              "x-lerta-mail-signature": signature,
            },
            body: rawBody,
            signal: AbortSignal.timeout(15_000),
          });
          if (!response.ok) {
            this.logger.warn(
              `Webhook ${endpoint.id} HTTP ${response.status} (${event})`,
            );
          }
        } catch (error) {
          this.logger.warn(
            `Webhook ${endpoint.id} request failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }),
    );
  }
}
