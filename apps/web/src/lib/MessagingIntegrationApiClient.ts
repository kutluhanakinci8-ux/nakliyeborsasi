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

export type MessagingIntegrationSnapshot = {
  companyId: string;
  webhooks: MessagingWebhookSnapshot[];
  availableWebhookEvents: string[];
  slackBridge: { enabled: boolean; configured: boolean };
  whatsappBridge: MessagingWhatsappBridgeSnapshot;
  publicApiBasePath: string;
  requiredOAuthScopes: string[];
  automationCatalogPath: string;
  botTokenPrefix?: string;
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
}
