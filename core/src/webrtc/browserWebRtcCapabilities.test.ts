import { describe, expect, it } from "vitest";
import { summarizeBrowserWebRtcSupport } from "./browserWebRtcCapabilities";

describe("summarizeBrowserWebRtcSupport", () => {
  it("returns false in Node test runtime", () => {
    const summary = summarizeBrowserWebRtcSupport();
    expect(summary.peerConnection).toBe(false);
    expect(summary.getUserMedia).toBe(false);
    expect(summary.ready).toBe(false);
  });
});
