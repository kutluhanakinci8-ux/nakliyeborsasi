import { PublicApiConfiguration } from "./PublicApiConfiguration";

export type MessagingPublicStatus = {
  translate: { deepl: boolean; libretranslate: boolean };
  webPush: { enabled: boolean; isolatedVapid: boolean };
  features: string[];
};

export async function fetchMessagingPublicStatus(): Promise<MessagingPublicStatus> {
  const base = PublicApiConfiguration.resolveBaseUrl();
  const response = await fetch(`${base}/messaging/status`);
  if (!response.ok) {
    throw new Error("messaging status");
  }
  return (await response.json()) as MessagingPublicStatus;
}
