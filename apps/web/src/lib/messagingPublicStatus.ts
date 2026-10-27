import { PublicApiConfiguration } from "./PublicApiConfiguration";

export type MessagingPublicStatus = {
  translate: { deepl: boolean; libretranslate: boolean };
  webPush: { enabled: boolean; isolatedVapid: boolean };
  features: string[];
  webrtc?: {
    clientStack: "browser";
    signaling: "redis_relay" | "unavailable" | "planned";
    codecsShippedWithApp: boolean;
    configPath?: string;
  };
  mobileExpoPush?: { registerPath: string; enabled: boolean };
  voiceNote?: {
    faz1Enabled: boolean;
    playerFaz2Enabled: boolean;
    maxDurationMs: number;
    transcribeFaz1Enabled?: boolean;
    sttConfigured?: boolean;
  };
};

export async function fetchMessagingPublicStatus(): Promise<MessagingPublicStatus> {
  const base = PublicApiConfiguration.resolveBaseUrl();
  const response = await fetch(`${base}/messaging/status`);
  if (!response.ok) {
    throw new Error("messaging status");
  }
  return (await response.json()) as MessagingPublicStatus;
}
