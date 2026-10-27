import { PublicApiConfiguration } from "./PublicApiConfiguration";

export type WebRtcMeetScheduleRecord = {
  threadId: string;
  scheduledAt: string;
  media: "audio" | "video";
  note?: string;
  createdByUserId: string;
  createdAt: string;
};

function apiBase(): string {
  return PublicApiConfiguration.resolveBaseUrl().replace(/\/$/, "");
}

export async function fetchMessagingWebRtcMeetSchedule(
  accessToken: string,
  threadId: string,
): Promise<WebRtcMeetScheduleRecord | null> {
  const response = await fetch(
    `${apiBase()}/messaging/webrtc/threads/${encodeURIComponent(threadId)}/schedule`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    throw new Error("webrtc schedule get");
  }
  const body = (await response.json()) as {
    schedule: WebRtcMeetScheduleRecord | null;
  };
  return body.schedule ?? null;
}

export async function upsertMessagingWebRtcMeetSchedule(
  accessToken: string,
  threadId: string,
  input: {
    scheduledAt: string;
    media: "audio" | "video";
    note?: string;
  },
): Promise<WebRtcMeetScheduleRecord> {
  const response = await fetch(
    `${apiBase()}/messaging/webrtc/threads/${encodeURIComponent(threadId)}/schedule`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "webrtc schedule put");
  }
  const body = (await response.json()) as { schedule: WebRtcMeetScheduleRecord };
  return body.schedule;
}

export async function clearMessagingWebRtcMeetSchedule(
  accessToken: string,
  threadId: string,
): Promise<void> {
  const response = await fetch(
    `${apiBase()}/messaging/webrtc/threads/${encodeURIComponent(threadId)}/schedule`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!response.ok) {
    throw new Error("webrtc schedule delete");
  }
}

export function formatMeetScheduleLocal(iso: string, locale: string): string {
  const date = new Date(iso);
  return date.toLocaleString(locale.startsWith("en") ? "en-GB" : "tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function downloadMeetIcsFile(params: {
  scheduledAt: string;
  threadId: string;
  title: string;
  meetUrl: string;
  note?: string;
}): void {
  const start = new Date(params.scheduledAt);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const stamp = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const description = [params.note, params.meetUrl].filter(Boolean).join("\n");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lerta//Meet//TR",
    "BEGIN:VEVENT",
    `UID:meet-${params.threadId}-${start.getTime()}@lerta.com.tr`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${params.title.replace(/\n/g, " ")}`,
    description ? `DESCRIPTION:${description.replace(/\n/g, "\\n")}` : "",
    `URL:${params.meetUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "lerta-gorusme.ics";
  anchor.click();
  URL.revokeObjectURL(url);
}
