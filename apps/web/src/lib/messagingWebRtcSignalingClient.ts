import { PublicApiConfiguration } from "./PublicApiConfiguration";

export type MessagingWebRtcConfig = {
  iceServers: RTCIceServer[];
  signaling: "redis_relay" | "unavailable" | "planned";
};

export type WebRtcSignalEnvelope = {
  id: string;
  threadId: string;
  fromUserId: string;
  type: "offer" | "answer" | "ice";
  payload: string;
  createdAt: string;
};

function apiBase(): string {
  return PublicApiConfiguration.resolveBaseUrl().replace(/\/$/, "");
}

export async function fetchMessagingWebRtcConfig(
  accessToken: string,
): Promise<MessagingWebRtcConfig> {
  const response = await fetch(`${apiBase()}/messaging/webrtc/config`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error("webrtc config");
  }
  return (await response.json()) as MessagingWebRtcConfig;
}

export async function postMessagingWebRtcSignal(
  accessToken: string,
  threadId: string,
  type: WebRtcSignalEnvelope["type"],
  payload: string,
): Promise<WebRtcSignalEnvelope> {
  const response = await fetch(
    `${apiBase()}/messaging/webrtc/threads/${encodeURIComponent(threadId)}/signals`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type, payload }),
    },
  );
  if (!response.ok) {
    throw new Error("webrtc signal post");
  }
  const body = (await response.json()) as { signal: WebRtcSignalEnvelope };
  return body.signal;
}

export async function pollMessagingWebRtcSignals(
  accessToken: string,
  threadId: string,
  afterId?: string | null,
): Promise<WebRtcSignalEnvelope[]> {
  const query = afterId
    ? `?afterId=${encodeURIComponent(afterId)}`
    : "";
  const response = await fetch(
    `${apiBase()}/messaging/webrtc/threads/${encodeURIComponent(threadId)}/signals${query}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    throw new Error("webrtc signal poll");
  }
  const body = (await response.json()) as { signals: WebRtcSignalEnvelope[] };
  return body.signals;
}
