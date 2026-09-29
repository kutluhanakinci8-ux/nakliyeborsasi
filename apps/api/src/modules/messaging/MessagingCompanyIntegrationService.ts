import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  AuthenticatedUserContext,
  CompanyRoleCode,
  AuthorizationException,
} from "@nakliyeborsasi/core";
import {
  CompanyMessagingWebhookEndpointEntity,
  type MessagingWebhookEventType,
} from "../../infrastructure/database/entities/CompanyMessagingWebhookEndpointEntity";
import {
  CompanyMessagingSettingsEntity,
  type MessagingRetentionMode,
} from "../../infrastructure/database/entities/CompanyMessagingSettingsEntity";
import { generateWebhookSigningSecret } from "../notification/MailIntegrationCrypto";

const WEBHOOK_EVENTS: MessagingWebhookEventType[] = [
  "message.created",
  "thread.opened",
];

@Injectable()
export class MessagingCompanyIntegrationService {
  public constructor(
    @InjectRepository(CompanyMessagingWebhookEndpointEntity)
    private readonly webhookRepository: Repository<CompanyMessagingWebhookEndpointEntity>,
    @InjectRepository(CompanyMessagingSettingsEntity)
    private readonly settingsRepository: Repository<CompanyMessagingSettingsEntity>,
  ) {}

  public async getSnapshot(authenticatedUser: AuthenticatedUserContext) {
    this.assertOwner(authenticatedUser);
    const webhooks = await this.listWebhooks(authenticatedUser.companyId);
    const settings = await this.getSettings(authenticatedUser.companyId);
    return {
      companyId: authenticatedUser.companyId,
      webhooks,
      availableWebhookEvents: WEBHOOK_EVENTS,
      retention: settings,
      publicApiBasePath: "/api/v1/public/lerta-messaging/v1",
      requiredOAuthScope: "messaging:read",
    };
  }

  public async createWebhook(
    authenticatedUser: AuthenticatedUserContext,
    params: {
      url: string;
      description?: string | null;
      events: MessagingWebhookEventType[];
      enabled?: boolean;
    },
  ) {
    this.assertOwner(authenticatedUser);
    const url = this.normalizeWebhookUrl(params.url);
    const events = this.normalizeEvents(params.events);
    const { plaintext, prefix } = generateWebhookSigningSecret();
    const row = await this.webhookRepository.save(
      this.webhookRepository.create({
        companyId: authenticatedUser.companyId,
        url,
        description: params.description?.trim().slice(0, 120) ?? null,
        events,
        signingSecret: plaintext,
        signingSecretPrefix: prefix,
        enabled: params.enabled ?? true,
      }),
    );
    return {
      webhook: this.toWebhookView(row),
      signingSecret: plaintext,
    };
  }

  public async updateWebhook(
    authenticatedUser: AuthenticatedUserContext,
    webhookId: string,
    params: {
      url?: string;
      description?: string | null;
      events?: MessagingWebhookEventType[];
      enabled?: boolean;
      rotateSigningSecret?: boolean;
    },
  ) {
    this.assertOwner(authenticatedUser);
    const row = await this.webhookRepository.findOne({
      where: { id: webhookId, companyId: authenticatedUser.companyId },
    });
    if (!row) {
      throw new NotFoundException("Webhook bulunamadı.");
    }
    if (params.url !== undefined) {
      row.url = this.normalizeWebhookUrl(params.url);
    }
    if (params.description !== undefined) {
      row.description = params.description?.trim().slice(0, 120) ?? null;
    }
    if (params.events !== undefined) {
      row.events = this.normalizeEvents(params.events);
    }
    if (params.enabled !== undefined) {
      row.enabled = params.enabled;
    }
    let signingSecret: string | null = null;
    if (params.rotateSigningSecret) {
      const generated = generateWebhookSigningSecret();
      row.signingSecret = generated.plaintext;
      row.signingSecretPrefix = generated.prefix;
      signingSecret = generated.plaintext;
    }
    await this.webhookRepository.save(row);
    return {
      webhook: this.toWebhookView(row),
      signingSecret,
    };
  }

  public async updateRetention(
    authenticatedUser: AuthenticatedUserContext,
    params: {
      retentionDays: number | null;
      retentionMode?: MessagingRetentionMode;
    },
  ) {
    this.assertOwner(authenticatedUser);
    if (
      params.retentionDays !== null &&
      (params.retentionDays < 30 || params.retentionDays > 3650)
    ) {
      throw new BadRequestException("retentionDays 30–3650 veya null olmalı.");
    }
    let row = await this.settingsRepository.findOne({
      where: { companyId: authenticatedUser.companyId },
    });
    if (!row) {
      row = this.settingsRepository.create({
        companyId: authenticatedUser.companyId,
        retentionDays: null,
        retentionMode: "archive",
      });
    }
    row.retentionDays = params.retentionDays;
    if (params.retentionMode) {
      row.retentionMode = params.retentionMode;
    }
    await this.settingsRepository.save(row);
    return this.getSettings(authenticatedUser.companyId);
  }

  private async getSettings(companyId: string) {
    const row = await this.settingsRepository.findOne({
      where: { companyId },
    });
    return {
      retentionDays: row?.retentionDays ?? null,
      retentionMode: row?.retentionMode ?? "archive",
    };
  }

  private async listWebhooks(companyId: string) {
    const rows = await this.webhookRepository.find({
      where: { companyId },
      order: { createdAt: "DESC" },
    });
    return rows.map((row) => this.toWebhookView(row));
  }

  private toWebhookView(row: CompanyMessagingWebhookEndpointEntity) {
    return {
      id: row.id,
      url: row.url,
      description: row.description,
      events: row.events,
      enabled: row.enabled,
      signingSecretPrefix: row.signingSecretPrefix,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private normalizeWebhookUrl(url: string): string {
    const trimmed = url.trim();
    if (!/^https:\/\//i.test(trimmed)) {
      throw new BadRequestException("Webhook URL https ile başlamalı.");
    }
    return trimmed.slice(0, 2048);
  }

  private normalizeEvents(
    events: MessagingWebhookEventType[],
  ): MessagingWebhookEventType[] {
    const unique = [...new Set(events)].filter((event) =>
      WEBHOOK_EVENTS.includes(event),
    );
    if (!unique.length) {
      throw new BadRequestException("En az bir geçerli event seçin.");
    }
    return unique;
  }

  private assertOwner(authenticatedUser: AuthenticatedUserContext): void {
    if (!authenticatedUser.roleCodes.includes(CompanyRoleCode.CompanyOwner)) {
      throw new AuthorizationException(
        "Messaging entegrasyon ayarları firma yöneticisi gerektirir.",
      );
    }
  }
}
