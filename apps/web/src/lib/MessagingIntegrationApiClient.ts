import { AuthenticatedApiClient } from "./AuthenticatedApiClient";

export type MessagingWhatsappBridgeSnapshot = {
  enabled: boolean;
  configured: boolean;
  notifyE164Masked: string | null;
  deliveryConfigured: boolean;
  channel?: "twilio" | "webhook" | "none";
  twilioContentSidConfigured?: boolean;
  twilioLikelyNeedsContentSid?: boolean;
  deliveryWarningTr?: string | null;
  kvkkNoticeTr: string;
  kvkkAcceptedAt: string | null;
};

export type MessagingWebhookSnapshot = {
  id: string;
  url: string;
  enabled: boolean;
  events: string[];
};

export type MessagingRetentionSnapshot = {
  retentionDays: number | null;
  retentionMode: "archive" | "delete";
};

export type MessagingIntegrationSnapshot = {
  companyId: string;
  webhooks: MessagingWebhookSnapshot[];
  availableWebhookEvents: string[];
  retention: MessagingRetentionSnapshot;
  slackBridge: { enabled: boolean; configured: boolean };
  whatsappBridge: MessagingWhatsappBridgeSnapshot;
  publicApiBasePath: string;
  requiredOAuthScopes: string[];
  automationCatalogPath: string;
  botTokenPrefix?: string;
};

export type MessagingAutomationCatalog = {
  version: string;
  platforms: string[];
  triggers: Array<{
    event: string;
    descriptionTr: string;
    subscribeVia: string;
  }>;
  actions: Array<{
    scope: string;
    method: string;
    path: string;
  }>;
  zapier: { hookUrlPattern: string; noteTr: string };
  make: { noteTr: string };
};

export class MessagingIntegrationApiClient {
  public static async fetchSnapshot(
    accessToken: string,
  ): Promise<{ integration: MessagingIntegrationSnapshot }> {
    return AuthenticatedApiClient.fetchJson(
      accessToken,
      "/messaging/integration",
    ) as Promise<{ integration: MessagingIntegrationSnapshot }>;
  }

  public static async updateWhatsappBridge(
    accessToken: string,
    params: {
      whatsappNotifyE164?: string | null;
      enabled: boolean;
      kvkkNoticeAccepted?: boolean;
    },
  ): Promise<{ whatsapp: unknown }> {
    return AuthenticatedApiClient.fetchJson(
      accessToken,
      "/messaging/integration/whatsapp-bridge",
      {
        method: "PATCH",
        body: JSON.stringify(params),
      },
    ) as Promise<{ whatsapp: unknown }>;
  }

  public static async sendWhatsappBridgeTest(
    accessToken: string,
  ): Promise<{ ok: boolean }> {
    return AuthenticatedApiClient.fetchJson(
      accessToken,
      "/messaging/integration/whatsapp-bridge/test",
      { method: "POST" },
    ) as Promise<{ ok: boolean }>;
  }

  public static async updateSlackBridge(
    accessToken: string,
    params: {
      slackIncomingWebhookUrl?: string | null;
      enabled: boolean;
    },
  ): Promise<{ slack: unknown }> {
    return AuthenticatedApiClient.fetchJson(
      accessToken,
      "/messaging/integration/slack-bridge",
      {
        method: "PATCH",
        body: JSON.stringify(params),
      },
    ) as Promise<{ slack: unknown }>;
  }

  public static async fetchAutomationCatalog(
    accessToken: string,
  ): Promise<{ catalog: MessagingAutomationCatalog }> {
    return AuthenticatedApiClient.fetchJson(
      accessToken,
      "/messaging/integration/automation-catalog",
    ) as Promise<{ catalog: MessagingAutomationCatalog }>;
  }

  public static async updateRetention(
    accessToken: string,
    params: {
      retentionDays: number | null;
      retentionMode?: "archive" | "delete";
    },
  ): Promise<{ retention: MessagingRetentionSnapshot }> {
    return AuthenticatedApiClient.fetchJson(
      accessToken,
      "/messaging/integration/retention",
      {
        method: "PATCH",
        body: JSON.stringify(params),
      },
    ) as Promise<{ retention: MessagingRetentionSnapshot }>;
  }
}
