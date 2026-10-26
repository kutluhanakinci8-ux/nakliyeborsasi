export type WebRtcIceServerConfig = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

const DEFAULT_STUN: WebRtcIceServerConfig[] = [
  { urls: "stun:stun.l.google.com:19302" },
];

export function resolveMessagingWebRtcIceServers(): WebRtcIceServerConfig[] {
  const raw = process.env.MESSAGING_WEBRTC_ICE_SERVERS?.trim();
  if (!raw) {
    return DEFAULT_STUN;
  }
  try {
    const parsed = JSON.parse(raw) as WebRtcIceServerConfig[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_STUN;
    }
    return parsed;
  } catch {
    return DEFAULT_STUN;
  }
}
