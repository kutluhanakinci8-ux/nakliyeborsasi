import { AuthenticatedApiClient } from "./AuthenticatedApiClient";

export type MessagingWhatsappBridgeSnapshot = {
  enabled: boolean;
  configured: boolean;
  notifyE164Masked: string | null;
  deliveryConfigured: boolean;
  kvkkNoticeTr: string;
  kvkkAcceptedAt: string | null;
};

export type MessagingIntegrationSnapshot = {
  companyId: string;
  whatsappBridge: MessagingWhatsappBridgeSnapshot;
  publicApiBasePath: string;
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
}
