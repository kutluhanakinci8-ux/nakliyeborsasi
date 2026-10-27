import { afterEach, describe, expect, it } from "vitest";
import {
  enrichTurnMonitorWithIceCaps,
  probeMessagingWebRtcTurnMonitor,
} from "./messagingWebRtcTurnMonitor";

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

  it("enriches from ice caps", () => {
    const base = {
      enabled: false,
      ok: false,
      source: "disabled" as const,
      activeAllocationsHint: null,
      checkedAt: null,
    };
    const enriched = enrichTurnMonitorWithIceCaps(base, true);
    expect(enriched.enabled).toBe(true);
    expect(enriched.detail).toBe("turn_in_ice_servers");
  });

  it("reads env hint", async () => {
    process.env.MESSAGING_WEBRTC_TURN_ALLOCATIONS_HINT = "42";
    const snap = await probeMessagingWebRtcTurnMonitor();
    expect(snap.enabled).toBe(true);
    expect(snap.activeAllocationsHint).toBe(42);
    expect(snap.source).toBe("env_hint");
  });
});
