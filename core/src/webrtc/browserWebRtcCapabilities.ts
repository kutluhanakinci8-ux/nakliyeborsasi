/** Tarayıcı WebRTC (W3C) — codec'ler kullanıcı agent'ta; libvpx/libwebm dağıtılmaz. */

export type BrowserWebRtcSupportSummary = {
  peerConnection: boolean;
  getUserMedia: boolean;
  ready: boolean;
};

function hasPeerConnectionApi(): boolean {
  if (typeof globalThis === "undefined") {
    return false;
  }
  const g = globalThis as typeof globalThis & {
    RTCPeerConnection?: unknown;
    webkitRTCPeerConnection?: unknown;
  };
  return (
    typeof g.RTCPeerConnection === "function" ||
    typeof g.webkitRTCPeerConnection === "function"
  );
}

function hasGetUserMediaApi(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return typeof navigator.mediaDevices?.getUserMedia === "function";
}

export function summarizeBrowserWebRtcSupport(): BrowserWebRtcSupportSummary {
  const peerConnection = hasPeerConnectionApi();
  const getUserMedia = hasGetUserMediaApi();
  return {
    peerConnection,
    getUserMedia,
    ready: peerConnection && getUserMedia,
  };
}
