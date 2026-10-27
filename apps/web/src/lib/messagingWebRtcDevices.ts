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

export type CallMediaMode = "audio" | "video";

export async function acquireWebRtcLocalStream(params: {
  mode: CallMediaMode;
  audioDeviceId?: string;
  videoDeviceId?: string;
}): Promise<MediaStream> {
  const audio: boolean | MediaTrackConstraints = params.audioDeviceId
    ? { deviceId: { exact: params.audioDeviceId } }
    : true;
  const video: boolean | MediaTrackConstraints =
    params.mode === "audio"
      ? false
      : params.videoDeviceId
        ? {
            deviceId: { exact: params.videoDeviceId },
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
          }
        : {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
          };
  return navigator.mediaDevices.getUserMedia({ audio, video });
}

export function formatCallDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
