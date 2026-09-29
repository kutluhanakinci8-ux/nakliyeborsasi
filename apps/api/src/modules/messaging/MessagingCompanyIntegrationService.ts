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
import { MessagingBotService } from "./MessagingBotService";
import { MessagingWhatsappBridgeService } from "./MessagingWhatsappBridgeService";

export function maskWhatsappNotifyE164(e164: string): string {
  const normalized = e164.replace(/\s/g, "");
  if (normalized.length <= 6) {
    return "••••••";
  }
  return `${normalized.slice(0, 4)}•••${normalized.slice(-4)}`;
}

const WEBHOOK_EVENTS: MessagingWebhookEventType[] = [
  "message.created",
  "thread.opened",
  "message.stamped",
];

export const MESSAGING_WHATSAPP_KVKK_NOTICE_TR =
  "WhatsApp bildirim köprüsü yalnızca yeni mesaj uyarısı ve deep link gönderir; tam mesaj geçmişi Meta/WhatsApp altyapısına aktarılmaz. Operasyonel kayıt Lerta firma sohbetinde saklanır. Etkinleştirmek için firma yetkilisi onayı gerekir.";

@Injectable()
export class MessagingCompanyIntegrationService {
  public constructor(
    @InjectRepository(CompanyMessagingWebhookEndpointEntity)
    private readonly webhookRepository: Repository<CompanyMessagingWebhookEndpointEntity>,
    @InjectRepository(CompanyMessagingSettingsEntity)
    private readonly settingsRepository: Repository<CompanyMessagingSettingsEntity>,
    private readonly messagingBotService: MessagingBotService,
    private readonly messagingWhatsappBridgeService: MessagingWhatsappBridgeService,
  ) {}

  public async getSnapshot(authenticatedUser: AuthenticatedUserContext) {
    this.assertOwner(authenticatedUser);
    const webhooks = await this.listWebhooks(authenticatedUser.companyId);
    const settings = await this.getSettings(authenticatedUser.companyId);
    const settingsRow = await this.settingsRepository.findOne({
      where: { companyId: authenticatedUser.companyId },
    });
    const bots = await this.messagingBotService.listBots(
      authenticatedUser.companyId,
    );
    return {
      companyId: authenticatedUser.companyId,
      webhooks,
      availableWebhookEvents: WEBHOOK_EVENTS,
      retention: settings,
      slackBridge: {
        enabled: settings.slackBridgeEnabled,
        configured: Boolean(settings.slackIncomingWebhookUrl),
      },
      whatsappBridge: {
        enabled: settings.whatsappBridgeEnabled,
        configured: Boolean(settings.whatsappNotifyE164),
        notifyE164Masked: settings.whatsappNotifyE164
          ? maskWhatsappNotifyE164(settings.whatsappNotifyE164)
          : null,
        ...this.messagingWhatsappBridgeService.getDeliverySnapshot(),
        deliveryConfigured:
          this.messagingWhatsappBridgeService.isDeliveryConfigured(),
        kvkkNoticeTr: MESSAGING_WHATSAPP_KVKK_NOTICE_TR,
        kvkkAcceptedAt:
          settingsRow?.whatsappBridgeKvkkAcceptedAt?.toISOString() ?? null,
      },
      bots,
      automationCatalogPath: "/api/v1/messaging/integration/automation-catalog",
      publicApiBasePath: "/api/v1/public/lerta-messaging/v1",
      requiredOAuthScopes: ["messaging:read", "messaging:write"],
      botTokenPrefix: "lerta_msg_bot_live_",
    };
  }

  public getAutomationCatalog() {
    return {
      version: "2026-09-fs6",
      platforms: ["zapier", "make", "custom"],
      triggers: [
        {
          event: "message.created",
          descriptionTr: "Yeni firma sohbet mesajı",
          subscribeVia: "POST /messaging/integration/webhooks",
        },
        {
          event: "thread.opened",
          descriptionTr: "Yeni sohbet kanalı",
          subscribeVia: "POST /messaging/integration/webhooks",
        },
        {
          event: "message.stamped",
          descriptionTr: "İşlem damgası (onay/red/görüldü)",
          subscribeVia: "POST /messaging/integration/webhooks",
        },
      ],
      actions: [
        {
          scope: "messaging:write",
          method: "POST",
          path: "/public/lerta-messaging/v1/threads/{threadId}/messages",
        },
        {
          scope: "messaging:write",
          method: "POST",
          path: "/public/lerta-messaging/v1/threads/{threadId}/messages/{messageId}/stamp",
        },
        {
          scope: "messaging:read",
          method: "GET",
          path: "/public/lerta-messaging/v1/threads",
        },
      ],
      zapier: {
        hookUrlPattern: "https://hooks.zapier.com/hooks/catch/...",
        noteTr: "Zapier Webhooks by Zapier → Catch Hook; Lerta webhook events alanına message.created ekleyin.",
      },
      make: {
        noteTr: "Make Custom webhook modülü; Lerta imzalı webhook çıktısını HTTP modülü ile doğrulayın.",
      },
    };
  }

  public async updateSlackBridge(
    authenticatedUser: AuthenticatedUserContext,
    params: {
      slackIncomingWebhookUrl: string | null;
      enabled: boolean;
    },
  ) {
    this.assertOwner(authenticatedUser);
    let row = await this.settingsRepository.findOne({
      where: { companyId: authenticatedUser.companyId },
    });
    if (!row) {
      row = this.settingsRepository.create({
        companyId: authenticatedUser.companyId,
        retentionDays: null,
        retentionMode: "archive",
        slackIncomingWebhookUrl: null,
        slackBridgeEnabled: false,
      });
    }
    if (params.slackIncomingWebhookUrl !== null) {
      const url = params.slackIncomingWebhookUrl.trim();
      if (url && !/^https:\/\/hooks\.slack\.com\//i.test(url)) {
        throw new BadRequestException(
          "Slack incoming webhook hooks.slack.com ile başlamalı.",
        );
      }
      row.slackIncomingWebhookUrl = url ? url.slice(0, 2048) : null;
    }
    row.slackBridgeEnabled = params.enabled;
    await this.settingsRepository.save(row);
    return this.getSettings(authenticatedUser.companyId);
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
      slackBridgeEnabled: row?.slackBridgeEnabled ?? false,
      slackIncomingWebhookUrl: row?.slackIncomingWebhookUrl ?? null,
      whatsappBridgeEnabled: row?.whatsappBridgeEnabled ?? false,
      whatsappNotifyE164: row?.whatsappNotifyE164 ?? null,
    };
  }

  public async sendWhatsappBridgeTest(
    authenticatedUser: AuthenticatedUserContext,
  ): Promise<{ ok: boolean; reason?: string }> {
    this.assertOwner(authenticatedUser);
    const result = await this.messagingWhatsappBridgeService.sendTestNotification(
      authenticatedUser.companyId,
    );
    if (!result.ok) {
      throw new BadRequestException(result.reason);
    }
    return { ok: true };
  }

  public async updateWhatsappBridge(
    authenticatedUser: AuthenticatedUserContext,
    params: {
      whatsappNotifyE164?: string | null;
      enabled: boolean;
      kvkkNoticeAccepted?: boolean;
    },
  ) {
    this.assertOwner(authenticatedUser);
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
    if (params.whatsappNotifyE164 !== undefined && params.whatsappNotifyE164 !== null) {
      const phone = params.whatsappNotifyE164.trim();
      if (phone && !/^\+[1-9]\d{7,14}$/.test(phone)) {
        throw new BadRequestException("whatsappNotifyE164 E.164 formatında olmalı (+...).");
      }
      row.whatsappNotifyE164 = phone ? phone.slice(0, 24) : null;
    }
    if (params.enabled) {
      if (!params.kvkkNoticeAccepted) {
        throw new BadRequestException(
          "WhatsApp köprüsü için KVKK bilgilendirme onayı gerekir (kvkkNoticeAccepted).",
        );
      }
      if (!row.whatsappNotifyE164?.trim()) {
        throw new BadRequestException(
          "Etkinleştirmeden önce whatsappNotifyE164 (+E.164) girin.",
        );
      }
      row.whatsappBridgeKvkkAcceptedAt = new Date();
    } else {
      row.whatsappBridgeEnabled = false;
      await this.settingsRepository.save(row);
      return this.getSettings(authenticatedUser.companyId);
    }
    row.whatsappBridgeEnabled = true;
    await this.settingsRepository.save(row);
    return this.getSettings(authenticatedUser.companyId);
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
