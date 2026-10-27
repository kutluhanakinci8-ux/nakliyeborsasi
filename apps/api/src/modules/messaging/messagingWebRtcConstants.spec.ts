import { describe, expect, it } from "vitest";
import { MESSAGING_WEBRTC_MAX_PARTICIPANTS } from "./messagingWebRtcConstants";

describe("messagingWebRtcConstants", () => {
  it("caps mesh calls at three participants", () => {
    expect(MESSAGING_WEBRTC_MAX_PARTICIPANTS).toBe(3);
  });
});
