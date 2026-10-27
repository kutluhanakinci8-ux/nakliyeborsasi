import { PublicApiConfiguration } from "./PublicApiConfiguration";

export type WebRtcMeetOverflowIntentStatus = {
  registered: boolean;
  threadIntentCount: number;
};

function apiBase(): string {
  return PublicApiConfiguration.resolveBaseUrl().replace(/\/$/, "");
}

export async function fetchMessagingWebRtcOverflowIntentStatus(
  accessToken: string,
  threadId: string,
): Promise<WebRtcMeetOverflowIntentStatus> {
  const response = await fetch(
    `${apiBase()}/messaging/webrtc/threads/${encodeURIComponent(threadId)}/overflow-intent`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    throw new Error("webrtc overflow intent status");
  }
  const body = (await response.json()) as {
    status: WebRtcMeetOverflowIntentStatus;
  };
  return body.status;
}

export async function postMessagingWebRtcOverflowIntent(
  accessToken: string,
  threadId: string,
  note?: string,
): Promise<void> {
  const response = await fetch(
    `${apiBase()}/messaging/webrtc/threads/${encodeURIComponent(threadId)}/overflow-intent`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(note ? { note } : {}),
    },
  );
  if (!response.ok) {
    throw new Error("webrtc overflow intent post");
  }
}
