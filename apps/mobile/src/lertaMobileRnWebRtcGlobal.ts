import type { ComponentType } from "react";

export type RnRtcViewProps = {
  streamURL?: string;
  style?: object;
  objectFit?: "cover" | "contain";
};

export type LertaRnWebRtcGlobal = {
  RTCPeerConnection: new (config: {
    iceServers?: Array<{ urls: string | string[] }>;
  }) => RnPeerConnection;
  mediaDevices: {
    getUserMedia: (constraints: {
      audio?: boolean;
      video?: boolean;
    }) => Promise<RnMediaStream>;
  };
  RTCView?: ComponentType<RnRtcViewProps>;
};

export type RnMediaStream = {
  getTracks: () => Array<{ stop: () => void }>;
  toURL?: () => string;
};

export type RnPeerConnection = {
  addTrack: (track: unknown, stream: RnMediaStream) => void;
  createOffer: () => Promise<{ type: string; sdp?: string }>;
  createAnswer: () => Promise<{ type: string; sdp?: string }>;
  setLocalDescription: (desc: {
    type: string;
    sdp?: string;
  }) => Promise<void>;
  setRemoteDescription: (desc: {
    type: string;
    sdp?: string;
  }) => Promise<void>;
  addIceCandidate: (candidate: unknown) => Promise<void>;
  close: () => void;
  onicecandidate: ((ev: { candidate: unknown }) => void) | null;
  ontrack: ((ev: { streams: RnMediaStream[] }) => void) | null;
};

export function readLertaRnWebRtcRtcView(): ComponentType<RnRtcViewProps> | null {
  return readLertaRnWebRtcGlobal()?.RTCView ?? null;
}

export function readLertaRnWebRtcGlobal(): LertaRnWebRtcGlobal | null {
  const g = globalThis as unknown as { LertaRnWebRTC?: LertaRnWebRtcGlobal };
  const mod = g.LertaRnWebRTC;
  if (!mod?.RTCPeerConnection || !mod?.mediaDevices?.getUserMedia) {
    return null;
  }
  return mod;
}
