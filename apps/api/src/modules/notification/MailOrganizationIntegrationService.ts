import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { MailOrganizationApiKeyEntity } from "../../infrastructure/database/entities/MailOrganizationApiKeyEntity";
import {
  MailOrganizationWebhookEndpointEntity,
  type MailWebhookEventType,
} from "../../infrastructure/database/entities/MailOrganizationWebhookEndpointEntity";
import { SubscriptionPlanDisplayCatalog } from "../subscription/SubscriptionPlanDisplayCatalog";
import { MailSaasSubscriptionService } from "./MailSaasSubscriptionService";
import {
  generateApiKeyPlaintext,
  generateWebhookSigningSecret,
  hashIntegrationSecret,
} from "./MailIntegrationCrypto";

const WEBHOOK_EVENTS: MailWebhookEventType[] = [
  "message.sent",
  "message.failed",
  "inbound.received",
];

@Injectable()
export class MailOrganizationIntegrationService {
  public constructor(
    @InjectRepository(MailOrganizationApiKeyEntity)
    private readonly apiKeyRepository: Repository<MailOrganizationApiKeyEntity>,
    @InjectRepository(MailOrganizationWebhookEndpointEntity)
    private readonly webhookRepository: Repository<MailOrganizationWebhookEndpointEntity>,
    private readonly mailSaasSubscriptionService: MailSaasSubscriptionService,
    private readonly configService: ConfigService,
  ) {}

  public async getIntegrationSnapshot(organizationId: string) {
    const plan = await this.mailSaasSubscriptionService.getOrganizationMailPlan(
      organizationId,
    );
    const allowed = this.isPublicApiAllowedForPlanCode(plan.planCode);
    const keys = await this.listApiKeys(organizationId);
    const webhooks = await this.listWebhooks(organizationId);
    return {
      allowed,
      planCode: plan.planCode,
      detailTr: allowed
        ? "Public API ve webhook uç noktaları kullanılabilir."
        : "Entegrasyon Enterprise mail planında (lerta_mail_enterprise_tr).",
      apiKeys: keys,
      webhooks,
      availableWebhookEvents: WEBHOOK_EVENTS,
      publicApiBasePath: "/api/v1/public/lerta-mail/v1",
    };
  }

  public isPublicApiAllowedForPlanCode(planCode: string | null): boolean {
    if (!planCode) {
      return false;
    }
    const display = SubscriptionPlanDisplayCatalog.find(planCode);
    if (display?.mailPublicApiAllowed) {
      return true;
    }
    const extra = this.configService
      .get<string>("MAIL_PUBLIC_API_EXTRA_PLAN_CODES")
      ?.split(/[,;]/)
      .map((code) => code.trim())
      .filter(Boolean);
    return extra?.includes(planCode) ?? false;
  }

  public async assertPublicApiAllowed(organizationId: string): Promise<void> {
    const plan = await this.mailSaasSubscriptionService.getOrganizationMailPlan(
      organizationId,
    );
    if (!this.isPublicApiAllowedForPlanCode(plan.planCode)) {
      throw new ForbiddenException(
        "Public API bu planda kapalı. Enterprise plana geçin.",
      );
    }
  }

  public async authenticateApiKey(
    plaintext: string,
  ): Promise<{ organizationId: string; apiKeyId: string } | null> {
    const trimmed = plaintext.trim();
    if (!trimmed.startsWith("lerta_mail_live_")) {
      return null;
    }
    const hash = hashIntegrationSecret(trimmed);
    const row = await this.apiKeyRepository.findOne({
      where: { keyHash: hash, revokedAt: IsNull() },
    });
    if (!row) {
      return null;
    }
    if (!this.isPublicApiAllowedForPlanCode(
      (
        await this.mailSaasSubscriptionService.getOrganizationMailPlan(
          row.organizationId,
        )
      ).planCode,
    )) {
      return null;
    }
    row.lastUsedAt = new Date();
    await this.apiKeyRepository.save(row);
    return { organizationId: row.organizationId, apiKeyId: row.id };
  }

  public async createApiKey(organizationId: string, label: string) {
    await this.assertPublicApiAllowed(organizationId);
    const { plaintext, prefix } = generateApiKeyPlaintext();
    const row = await this.apiKeyRepository.save(
      this.apiKeyRepository.create({
        organizationId,
        label: label.trim().slice(0, 80) || "API anahtarı",
        keyPrefix: prefix,
        keyHash: hashIntegrationSecret(plaintext),
        lastUsedAt: null,
        revokedAt: null,
      }),
    );
    return {
      id: row.id,
      label: row.label,
      keyPrefix: row.keyPrefix,
      createdAt: row.createdAt.toISOString(),
      apiKey: plaintext,
    };
  }

  public async listApiKeys(organizationId: string) {
    const rows = await this.apiKeyRepository.find({
      where: { organizationId, revokedAt: IsNull() },
      order: { createdAt: "DESC" },
    });
    return rows.map((row) => ({
      id: row.id,
      label: row.label,
      keyPrefix: row.keyPrefix,
      lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  public async revokeApiKey(organizationId: string, keyId: string): Promise<boolean> {
    await this.assertPublicApiAllowed(organizationId);
    const row = await this.apiKeyRepository.findOne({
      where: { id: keyId, organizationId, revokedAt: IsNull() },
    });
    if (!row) {
      return false;
    }
    row.revokedAt = new Date();
    await this.apiKeyRepository.save(row);
    return true;
  }

  public async createWebhook(
    organizationId: string,
    params: {
      url: string;
      description?: string | null;
      events: MailWebhookEventType[];
      enabled?: boolean;
    },
  ) {
    await this.assertPublicApiAllowed(organizationId);
    const url = this.normalizeWebhookUrl(params.url);
    const events = this.normalizeEvents(params.events);
    const { plaintext, prefix } = generateWebhookSigningSecret();
    const row = await this.webhookRepository.save(
      this.webhookRepository.create({
        organizationId,
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
    organizationId: string,
    webhookId: string,
    params: {
      url?: string;
      description?: string | null;
      events?: MailWebhookEventType[];
      enabled?: boolean;
      rotateSigningSecret?: boolean;
    },
  ) {
    await this.assertPublicApiAllowed(organizationId);
    const row = await this.webhookRepository.findOne({
      where: { id: webhookId, organizationId },
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

  public async listWebhooks(organizationId: string) {
    const rows = await this.webhookRepository.find({
      where: { organizationId },
      order: { createdAt: "DESC" },
    });
    return rows.map((row) => this.toWebhookView(row));
  }

  public async listEnabledWebhooksForEvent(
    organizationId: string,
    event: MailWebhookEventType,
  ): Promise<MailOrganizationWebhookEndpointEntity[]> {
    const rows = await this.webhookRepository.find({
      where: { organizationId, enabled: true },
    });
    return rows.filter((row) => row.events.includes(event));
  }

  private toWebhookView(row: MailOrganizationWebhookEndpointEntity) {
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
    if (!trimmed) {
      throw new BadRequestException("Webhook URL gerekli.");
    }
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      throw new BadRequestException("Geçersiz webhook URL.");
    }
    if (parsed.protocol !== "https:") {
      const allowHttp =
        this.configService.get<string>("MAIL_WEBHOOK_ALLOW_HTTP") === "true";
      if (!allowHttp) {
        throw new BadRequestException("Webhook URL https olmalıdır.");
      }
    }
    return parsed.toString();
  }

  private normalizeEvents(events: MailWebhookEventType[]): MailWebhookEventType[] {
    if (!events.length) {
      throw new BadRequestException("En az bir webhook olayı seçin.");
    }
    const unique = [...new Set(events)];
    for (const event of unique) {
      if (!WEBHOOK_EVENTS.includes(event)) {
        throw new BadRequestException(`Geçersiz olay: ${event}`);
      }
    }
    return unique;
  }
}
