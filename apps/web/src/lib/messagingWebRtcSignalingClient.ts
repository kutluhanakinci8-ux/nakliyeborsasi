import { PublicApiConfiguration } from "./PublicApiConfiguration";

export type MessagingWebRtcIceCaps = {
  iceServerEntries: number;
  stunUrlCount: number;
  turnUrlCount: number;
  turnCredentialsConfigured: boolean;
  usingDefaultStunOnly: boolean;
};

export type MessagingWebRtcTurnMonitor = {
  enabled: boolean;
  ok: boolean;
  source: "disabled" | "env_hint" | "http_probe";
  activeAllocationsHint: number | null;
  checkedAt: string | null;
  detail?: string;
};

export type MessagingWebRtcMeetCapacity = {
  topology: "mesh_p2p";
  meshMaxParticipants: number;
  sfuMode: "disabled";
  sfuMaxParticipants: number;
  effectiveMaxParticipants: number;
  overflowPolicy: "reject_join";
  overflowHintTr: string;
  sfuRoadmapHintTr: string;
  sfuOverflowIntent?: {
    enabled: boolean;
    registerPathTemplate: string;
    hintTr: string;
  };
};

export type MessagingWebRtcConfig = {
  iceServers: RTCIceServer[];
  signaling: "redis_relay" | "unavailable" | "planned";
  maxParticipants?: number;
  meshMode?: "p2p";
  capacity?: MessagingWebRtcMeetCapacity;
  iceCaps?: MessagingWebRtcIceCaps;
  turnMonitor?: MessagingWebRtcTurnMonitor;
  maxRecordingArchiveBytes?: number;
};

export type WebRtcRoomParticipant = {
  userId: string;
  companyId: string;
};

export type WebRtcRoomSnapshot = {
  threadId: string;
  maxParticipants: number;
  participants: WebRtcRoomParticipant[];
};

export type WebRtcSignalEnvelope = {
  id: string;
  threadId: string;
  fromUserId: string;
  type:
    | "offer"
    | "answer"
    | "ice"
    | "hangup"
    | "invite"
    | "raise"
    | "reaction"
    | "screen";
  payload: string;
  targetUserId?: string | null;
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

export async function fetchMessagingWebRtcCapacityPolicy(
  accessToken: string,
): Promise<MessagingWebRtcMeetCapacity> {
  const response = await fetch(`${apiBase()}/messaging/webrtc/capacity`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error("webrtc capacity");
  }
  const body = (await response.json()) as {
    capacity: MessagingWebRtcMeetCapacity;
  };
  return body.capacity;
}

export async function joinMessagingWebRtcRoom(
  accessToken: string,
  threadId: string,
): Promise<WebRtcRoomSnapshot> {
  const response = await fetch(
    `${apiBase()}/messaging/webrtc/threads/${encodeURIComponent(threadId)}/room/join`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!response.ok) {
    const text = await response.text();
    if (response.status === 409) {
      const trimmed = text.trim();
      throw new Error(
        trimmed.length > 0 && trimmed.length < 400
          ? trimmed
          : "Görüntülü görüşme dolu. Bir katılımcı ayrıldığında tekrar deneyin.",
      );
    }
    throw new Error(text || "webrtc room join");
  }
  const body = (await response.json()) as { room: WebRtcRoomSnapshot };
  return body.room;
}

export async function leaveMessagingWebRtcRoom(
  accessToken: string,
  threadId: string,
): Promise<void> {
  await fetch(
    `${apiBase()}/messaging/webrtc/threads/${encodeURIComponent(threadId)}/room/leave`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
}

export async function fetchMessagingWebRtcRoom(
  accessToken: string,
  threadId: string,
): Promise<WebRtcRoomSnapshot> {
  const response = await fetch(
    `${apiBase()}/messaging/webrtc/threads/${encodeURIComponent(threadId)}/room`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    throw new Error("webrtc room get");
  }
  const body = (await response.json()) as { room: WebRtcRoomSnapshot };
  return body.room;
}

export async function postMessagingWebRtcSignal(
  accessToken: string,
  threadId: string,
  type: WebRtcSignalEnvelope["type"],
  payload: string,
  targetUserId?: string | null,
): Promise<WebRtcSignalEnvelope> {
  const response = await fetch(
    `${apiBase()}/messaging/webrtc/threads/${encodeURIComponent(threadId)}/signals`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type,
        payload,
        ...(targetUserId ? { targetUserId } : {}),
      }),
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
