import { resolveApiBaseUrl } from "./lertaMobileAuth";

export type MobileVoiceNoteStatus = {
  faz1Enabled: boolean;
  mobileFaz3Enabled: boolean;
  maxDurationMs: number;
};

export async function fetchMessagingVoiceNoteStatus(
  accessToken: string,
): Promise<MobileVoiceNoteStatus | null> {
  const response = await fetch(`${resolveApiBaseUrl()}/messaging/status`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    return null;
  }
  const payload = (await response.json()) as {
    voiceNote?: {
      faz1Enabled?: boolean;
      mobileFaz3Enabled?: boolean;
      maxDurationMs?: number;
    };
  };
  const vn = payload.voiceNote ?? {};
  return {
    faz1Enabled: Boolean(vn.faz1Enabled),
    mobileFaz3Enabled: Boolean(vn.mobileFaz3Enabled),
    maxDurationMs: vn.maxDurationMs ?? 180_000,
  };
}

export async function sendMessagingVoiceNote(
  accessToken: string,
  threadId: string,
  params: {
    contentBase64: string;
    contentType: string;
    filename: string;
    durationMs: number;
  },
): Promise<{ ok: boolean; error?: string }> {
  const response = await fetch(
    `${resolveApiBaseUrl()}/messaging/threads/${encodeURIComponent(threadId)}/messages?lang=tr`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bodyText: "",
        attachments: [
          {
            filename: params.filename,
            contentType: params.contentType,
            contentBase64: params.contentBase64,
            kind: "voice_note",
            durationMs: params.durationMs,
          },
        ],
      }),
    },
  );
  if (!response.ok) {
    const text = await response.text();
    return { ok: false, error: text.slice(0, 240) || `HTTP ${response.status}` };
  }
  return { ok: true };
}
