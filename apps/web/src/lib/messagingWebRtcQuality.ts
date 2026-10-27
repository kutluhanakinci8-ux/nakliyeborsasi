export type VideoQualityProfile = "auto" | "saver" | "hd";

export type VideoEffect = "none" | "softBlur" | "lowLight";

export type CallLayoutMode = "grid" | "speaker";

export function videoConstraintsForProfile(
  profile: VideoQualityProfile,
  videoDeviceId?: string,
): MediaTrackConstraints {
  const base: MediaTrackConstraints = videoDeviceId
    ? { deviceId: { exact: videoDeviceId }, facingMode: "user" }
    : { facingMode: "user" };
  if (profile === "saver") {
    return {
      ...base,
      width: { ideal: 480, max: 640 },
      height: { ideal: 360, max: 480 },
      frameRate: { ideal: 12, max: 15 },
    };
  }
  if (profile === "hd") {
    return {
      ...base,
      width: { ideal: 1280, max: 1280 },
      height: { ideal: 720, max: 720 },
      frameRate: { ideal: 24, max: 30 },
    };
  }
  return {
    ...base,
    width: { ideal: 640, max: 960 },
    height: { ideal: 480, max: 540 },
    frameRate: { ideal: 20, max: 24 },
  };
}

export function maxVideoBitrateBps(profile: VideoQualityProfile): number {
  if (profile === "saver") {
    return 280_000;
  }
  if (profile === "hd") {
    return 1_200_000;
  }
  return 600_000;
}

export async function applyVideoSenderBitrate(
  pc: RTCPeerConnection,
  profile: VideoQualityProfile,
): Promise<void> {
  const maxBitrate = maxVideoBitrateBps(profile);
  const senders = pc.getSenders();
  for (const sender of senders) {
    if (sender.track?.kind !== "video") {
      continue;
    }
    const params = sender.getParameters();
    if (!params.encodings?.length) {
      params.encodings = [{}];
    }
    params.encodings[0].maxBitrate = maxBitrate;
    try {
      await sender.setParameters(params);
    } catch {
      /* tarayıcı desteklemeyebilir */
    }
  }
}

export async function applyQualityToAllPeerConnections(
  pcs: Iterable<RTCPeerConnection>,
  profile: VideoQualityProfile,
): Promise<void> {
  for (const pc of pcs) {
    await applyVideoSenderBitrate(pc, profile);
  }
}

export function qualityProfileLabel(profile: VideoQualityProfile): string {
  if (profile === "saver") {
    return "Veri tasarrufu";
  }
  if (profile === "hd") {
    return "HD";
  }
  return "Otomatik";
}
