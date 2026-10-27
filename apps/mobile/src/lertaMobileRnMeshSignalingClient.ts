import { resolveApiBaseUrl } from "./lertaMobileAuth";

export type RnMeshSignalType =
  | "offer"
  | "answer"
  | "ice"
  | "hangup"
  | "invite"
  | "raise"
  | "reaction"
  | "screen";

export type RnMeshSignalEnvelope = {
  id: string;
  threadId: string;
  fromUserId: string;
  type: RnMeshSignalType;
  payload: string;
  targetUserId?: string | null;
  createdAt: string;
};

export type RnMeshRoomSnapshot = {
  threadId: string;
  maxParticipants: number;
  participants: Array<{ userId: string; companyId: string }>;
};

function apiBase(): string {
  return resolveApiBaseUrl().replace(/\/$/, "");
}

export async function rnMeshJoinRoom(
  accessToken: string,
  threadId: string,
): Promise<RnMeshRoomSnapshot> {
  const response = await fetch(
    `${apiBase()}/messaging/webrtc/threads/${encodeURIComponent(threadId)}/room/join`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "mesh join");
  }
  const body = (await response.json()) as { room: RnMeshRoomSnapshot };
  return body.room;
}

export async function rnMeshLeaveRoom(
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

export async function rnMeshPollSignals(
  accessToken: string,
  threadId: string,
  afterId?: string | null,
): Promise<RnMeshSignalEnvelope[]> {
  const query = afterId ? `?afterId=${encodeURIComponent(afterId)}` : "";
  const response = await fetch(
    `${apiBase()}/messaging/webrtc/threads/${encodeURIComponent(threadId)}/signals${query}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    throw new Error("mesh poll");
  }
  const body = (await response.json()) as { signals: RnMeshSignalEnvelope[] };
  return body.signals ?? [];
}

export async function rnMeshPostSignal(
  accessToken: string,
  threadId: string,
  type: RnMeshSignalType,
  payload: string,
  targetUserId?: string | null,
): Promise<RnMeshSignalEnvelope> {
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
    throw new Error("mesh signal post");
  }
  const body = (await response.json()) as { signal: RnMeshSignalEnvelope };
  return body.signal;
}
