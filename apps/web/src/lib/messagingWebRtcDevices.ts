export type MediaDeviceLists = {
  audioInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
};

export async function listWebRtcMediaDevices(): Promise<MediaDeviceLists> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return {
    audioInputs: devices.filter((d) => d.kind === "audioinput"),
    audioOutputs: devices.filter((d) => d.kind === "audiooutput"),
    videoInputs: devices.filter((d) => d.kind === "videoinput"),
  };
}

import {
  type VideoQualityProfile,
  videoConstraintsForProfile,
} from "./messagingWebRtcQuality";

export type CallMediaMode = "audio" | "video";

export async function acquireWebRtcLocalStream(params: {
  mode: CallMediaMode;
  audioDeviceId?: string;
  videoDeviceId?: string;
  qualityProfile?: VideoQualityProfile;
}): Promise<MediaStream> {
  const audio: boolean | MediaTrackConstraints = params.audioDeviceId
    ? {
        deviceId: { exact: params.audioDeviceId },
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }
    : {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };
  const profile = params.qualityProfile ?? "auto";
  const video: boolean | MediaTrackConstraints =
    params.mode === "audio"
      ? false
      : videoConstraintsForProfile(profile, params.videoDeviceId);
  return navigator.mediaDevices.getUserMedia({ audio, video });
}

export function formatCallDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
