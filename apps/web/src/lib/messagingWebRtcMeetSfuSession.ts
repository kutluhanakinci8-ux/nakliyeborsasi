import { PublicApiConfiguration } from "./PublicApiConfiguration";

export type WebRtcMeetSfuSessionJoinBundle = {
  sessionId: string;
  threadId: string;
  signalingUrl: string;
  joinToken: string;
  joinQuery: Record<string, string>;
  maxParticipants: number;
  media: "audio" | "video";
  expiresAt: string;
  pilotHintTr: string;
};

function apiBase(): string {
  return PublicApiConfiguration.resolveBaseUrl().replace(/\/$/, "");
}

export async function fetchMessagingWebRtcSfuSession(
  accessToken: string,
  threadId: string,
): Promise<WebRtcMeetSfuSessionJoinBundle | null> {
  const response = await fetch(
    `${apiBase()}/messaging/webrtc/threads/${encodeURIComponent(threadId)}/sfu/session`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    throw new Error("webrtc sfu session get");
  }
  const body = (await response.json()) as {
    join: WebRtcMeetSfuSessionJoinBundle | null;
  };
  return body.join ?? null;
}

export async function createMessagingWebRtcSfuSession(
  accessToken: string,
  threadId: string,
  media: "audio" | "video" = "video",
): Promise<WebRtcMeetSfuSessionJoinBundle> {
  const response = await fetch(
    `${apiBase()}/messaging/webrtc/threads/${encodeURIComponent(threadId)}/sfu/session`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ media }),
    },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "webrtc sfu session post");
  }
  const body = (await response.json()) as {
    join: WebRtcMeetSfuSessionJoinBundle;
  };
  return body.join;
}

export function buildSfuPilotSignalingUrl(
  join: WebRtcMeetSfuSessionJoinBundle,
): string {
  try {
    const base = new URL(join.signalingUrl);
    for (const [key, value] of Object.entries(join.joinQuery)) {
      base.searchParams.set(key, value);
    }
    return base.toString();
  } catch {
    const params = new URLSearchParams(join.joinQuery);
    const sep = join.signalingUrl.includes("?") ? "&" : "?";
    return `${join.signalingUrl}${sep}${params.toString()}`;
  }
}

export function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return Promise.reject(new Error("clipboard"));
}
