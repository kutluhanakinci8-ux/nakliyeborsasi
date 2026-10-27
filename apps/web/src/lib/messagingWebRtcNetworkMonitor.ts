export type NetworkQualityLevel = "good" | "fair" | "poor" | "unknown";

export async function sampleNetworkQuality(
  pc: RTCPeerConnection,
): Promise<NetworkQualityLevel> {
  try {
    const stats = await pc.getStats();
    let rttMs: number | null = null;
    let packetsLost = 0;
    let packetsReceived = 0;
    stats.forEach((report) => {
      if (report.type === "candidate-pair" && report.state === "succeeded") {
        const rtt = report.currentRoundTripTime;
        if (typeof rtt === "number") {
          rttMs = rtt * 1000;
        }
      }
      if (report.type === "inbound-rtp" && report.kind === "video") {
        packetsLost += Number(report.packetsLost ?? 0);
        packetsReceived += Number(report.packetsReceived ?? 0);
      }
    });
    const lossRate =
      packetsReceived > 0 ? packetsLost / (packetsLost + packetsReceived) : 0;
    if (rttMs !== null && (rttMs > 400 || lossRate > 0.08)) {
      return "poor";
    }
    if (rttMs !== null && (rttMs > 200 || lossRate > 0.03)) {
      return "fair";
    }
    if (rttMs !== null) {
      return "good";
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}

export function networkQualityLabel(level: NetworkQualityLevel): string {
  switch (level) {
    case "good":
      return "Bağlantı iyi";
    case "fair":
      return "Bağlantı orta";
    case "poor":
      return "Zayıf bağlantı";
    default:
      return "Bağlantı ölçülüyor";
  }
}
