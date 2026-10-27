import { afterEach, describe, expect, it } from "vitest";
import {
  resolveMessagingWebRtcIceServers,
  summarizeMessagingWebRtcIceCaps,
} from "./messagingWebRtcIceConfig";

describe("resolveMessagingWebRtcIceServers", () => {
  afterEach(() => {
    delete process.env.MESSAGING_WEBRTC_ICE_SERVERS;
  });

  it("returns default STUN when env unset", () => {
    const servers = resolveMessagingWebRtcIceServers();
    expect(servers[0]?.urls).toContain("stun:");
  });

  it("parses JSON env", () => {
    process.env.MESSAGING_WEBRTC_ICE_SERVERS = JSON.stringify([
      { urls: "turn:turn.example.com", username: "u", credential: "p" },
    ]);
    const servers = resolveMessagingWebRtcIceServers();
    expect(servers[0]?.urls).toBe("turn:turn.example.com");
  });

  it("summarizes TURN caps", () => {
    process.env.MESSAGING_WEBRTC_ICE_SERVERS = JSON.stringify([
      { urls: "stun:stun.example.com" },
      { urls: "turn:turn.example.com", username: "u", credential: "p" },
    ]);
    const caps = summarizeMessagingWebRtcIceCaps();
    expect(caps.turnUrlCount).toBe(1);
    expect(caps.turnCredentialsConfigured).toBe(true);
    expect(caps.usingDefaultStunOnly).toBe(false);
  });
});
