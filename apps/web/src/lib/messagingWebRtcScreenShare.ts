export async function replaceOutgoingVideoTrack(
  connections: Iterable<RTCPeerConnection>,
  track: MediaStreamTrack | null,
): Promise<void> {
  for (const pc of connections) {
    const sender = pc.getSenders().find((s) => s.track?.kind === "video");
    if (sender) {
      await sender.replaceTrack(track);
    }
  }
}
