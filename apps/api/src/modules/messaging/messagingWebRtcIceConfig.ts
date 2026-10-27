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

function urlList(entry: WebRtcIceServerConfig): string[] {
  const urls = entry.urls;
  return Array.isArray(urls) ? urls : [urls];
}

function isTurnUrl(url: string): boolean {
  return url.startsWith("turn:") || url.startsWith("turns:");
}

export type MessagingWebRtcIceCapsSnapshot = {
  iceServerEntries: number;
  stunUrlCount: number;
  turnUrlCount: number;
  turnCredentialsConfigured: boolean;
  usingDefaultStunOnly: boolean;
};

export function summarizeMessagingWebRtcIceCaps(): MessagingWebRtcIceCapsSnapshot {
  const servers = resolveMessagingWebRtcIceServers();
  let stunUrlCount = 0;
  let turnUrlCount = 0;
  let turnCredentialsConfigured = false;
  for (const entry of servers) {
    for (const url of urlList(entry)) {
      if (isTurnUrl(url)) {
        turnUrlCount += 1;
        if (entry.username && entry.credential) {
          turnCredentialsConfigured = true;
        }
      } else if (url.startsWith("stun:")) {
        stunUrlCount += 1;
      }
    }
  }
  const usingDefaultStunOnly =
    servers.length === DEFAULT_STUN.length &&
    JSON.stringify(servers) === JSON.stringify(DEFAULT_STUN);
  return {
    iceServerEntries: servers.length,
    stunUrlCount,
    turnUrlCount,
    turnCredentialsConfigured,
    usingDefaultStunOnly,
  };
}
