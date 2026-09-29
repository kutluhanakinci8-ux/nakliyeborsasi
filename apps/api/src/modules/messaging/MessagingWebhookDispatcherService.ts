import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  CompanyMessagingWebhookEndpointEntity,
  type MessagingWebhookEventType,
} from "../../infrastructure/database/entities/CompanyMessagingWebhookEndpointEntity";
import { signWebhookPayload } from "../notification/MailIntegrationCrypto";

@Injectable()
export class MessagingWebhookDispatcherService {
  private readonly logger = new Logger(MessagingWebhookDispatcherService.name);

  public constructor(
    @InjectRepository(CompanyMessagingWebhookEndpointEntity)
    private readonly webhookRepository: Repository<CompanyMessagingWebhookEndpointEntity>,
  ) {}

  public dispatch(
    companyId: string,
    event: MessagingWebhookEventType,
    data: Record<string, unknown>,
  ): void {
    void this.deliver(companyId, event, data).catch((error) => {
      this.logger.warn(
        `Messaging webhook failed company=${companyId} event=${event}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });
  }

  private async deliver(
    companyId: string,
    event: MessagingWebhookEventType,
    data: Record<string, unknown>,
  ): Promise<void> {
    const endpoints = await this.webhookRepository.find({
      where: { companyId, enabled: true },
    });
    const matched = endpoints.filter((row) => row.events.includes(event));
    if (!matched.length) {
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
      matched.map(async (endpoint) => {
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
              "x-lerta-messaging-event": event,
              "x-lerta-messaging-timestamp": timestamp,
              "x-lerta-messaging-signature": signature,
            },
            body: rawBody,
            signal: AbortSignal.timeout(15_000),
          });
          if (!response.ok) {
            this.logger.warn(
              `Messaging webhook ${endpoint.id} HTTP ${response.status}`,
            );
          }
        } catch (error) {
          this.logger.warn(
            `Messaging webhook ${endpoint.id} failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }),
    );
  }
}
