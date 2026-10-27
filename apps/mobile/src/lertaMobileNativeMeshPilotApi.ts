import { resolveApiBaseUrl } from "./lertaMobileAuth";

export type NativeMeshPilotSession = {
  pilotSessionId: string;
  threadId: string;
  joinToken: string;
  maxParticipants: number;
  hintTr: string;
};

export async function createNativeMeshPilotSession(
  accessToken: string,
  threadId: string,
): Promise<NativeMeshPilotSession | null> {
  try {
    const response = await fetch(
      `${resolveApiBaseUrl()}/messaging/webrtc/threads/${encodeURIComponent(threadId)}/native-pilot/session`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    if (!response.ok) {
      return null;
    }
    const body = (await response.json()) as { session: NativeMeshPilotSession };
    return body.session;
  } catch {
    return null;
  }
}
