import { describe, expect, it } from "vitest";
import { maxVideoBitrateBps } from "./messagingWebRtcQuality";

describe("messagingWebRtcQuality", () => {
  it("orders bitrate by profile", () => {
    expect(maxVideoBitrateBps("saver")).toBeLessThan(maxVideoBitrateBps("auto"));
    expect(maxVideoBitrateBps("auto")).toBeLessThan(maxVideoBitrateBps("hd"));
  });
});
