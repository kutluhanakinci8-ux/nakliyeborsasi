import { PublicApiConfiguration } from "./PublicApiConfiguration";

export type WebRtcMeetRecordingArchiveMeta = {
  id: string;
  threadId: string;
  durationSeconds: number;
  media: "audio" | "video";
  filename: string;
  byteSize: number;
  hasBlob: boolean;
  createdByUserId: string;
  createdAt: string;
};

function apiBase(): string {
  return PublicApiConfiguration.resolveBaseUrl().replace(/\/$/, "");
}

export async function fetchMessagingWebRtcRecordingArchives(
  accessToken: string,
  threadId: string,
): Promise<WebRtcMeetRecordingArchiveMeta[]> {
  const response = await fetch(
    `${apiBase()}/messaging/webrtc/threads/${encodeURIComponent(threadId)}/recordings`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    throw new Error("webrtc recordings list");
  }
  const body = (await response.json()) as {
    archives: WebRtcMeetRecordingArchiveMeta[];
  };
  return body.archives ?? [];
}

export async function postMessagingWebRtcRecordingArchive(
  accessToken: string,
  threadId: string,
  input: {
    durationSeconds: number;
    media: "audio" | "video";
    filename?: string;
    contentBase64?: string;
  },
): Promise<WebRtcMeetRecordingArchiveMeta> {
  const response = await fetch(
    `${apiBase()}/messaging/webrtc/threads/${encodeURIComponent(threadId)}/recordings`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "webrtc recordings post");
  }
  const body = (await response.json()) as {
    archive: WebRtcMeetRecordingArchiveMeta;
  };
  return body.archive;
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("read"));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("read"));
    reader.readAsDataURL(blob);
  });
}
