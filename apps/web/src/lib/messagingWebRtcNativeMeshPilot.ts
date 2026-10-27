import { PublicApiConfiguration } from "./PublicApiConfiguration";

export type WebRtcNativeMeshPilotSession = {
  pilotSessionId: string;
  threadId: string;
  mode: "native_mesh_pilot";
  maxParticipants: number;
  joinToken: string;
  iceServers: RTCIceServer[];
  signalingRelay: "redis_relay";
  expiresAt: string;
  hintTr: string;
};

function apiBase(): string {
  return PublicApiConfiguration.resolveBaseUrl().replace(/\/$/, "");
}

export async function fetchMessagingWebRtcNativeMeshPilotSession(
  accessToken: string,
  threadId: string,
): Promise<WebRtcNativeMeshPilotSession | null> {
  const response = await fetch(
    `${apiBase()}/messaging/webrtc/threads/${encodeURIComponent(threadId)}/native-pilot/session`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    throw new Error("native mesh pilot get");
  }
  const body = (await response.json()) as {
    session: WebRtcNativeMeshPilotSession | null;
  };
  return body.session ?? null;
}

export async function createMessagingWebRtcNativeMeshPilotSession(
  accessToken: string,
  threadId: string,
): Promise<WebRtcNativeMeshPilotSession> {
  const response = await fetch(
    `${apiBase()}/messaging/webrtc/threads/${encodeURIComponent(threadId)}/native-pilot/session`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "native mesh pilot post");
  }
  const body = (await response.json()) as {
    session: WebRtcNativeMeshPilotSession;
  };
  return body.session;
}
