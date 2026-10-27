import { afterEach, describe, expect, it } from "vitest";
import { probeMessagingWebRtcTurnMonitor } from "./messagingWebRtcTurnMonitor";

describe("probeMessagingWebRtcTurnMonitor", () => {
  afterEach(() => {
    delete process.env.MESSAGING_WEBRTC_TURN_METRICS_URL;
    delete process.env.MESSAGING_WEBRTC_TURN_ALLOCATIONS_HINT;
  });

  it("returns disabled when unset", async () => {
    const snap = await probeMessagingWebRtcTurnMonitor();
    expect(snap.enabled).toBe(false);
    expect(snap.source).toBe("disabled");
  });

  it("reads env hint", async () => {
    process.env.MESSAGING_WEBRTC_TURN_ALLOCATIONS_HINT = "42";
    const snap = await probeMessagingWebRtcTurnMonitor();
    expect(snap.enabled).toBe(true);
    expect(snap.activeAllocationsHint).toBe(42);
    expect(snap.source).toBe("env_hint");
  });
});
