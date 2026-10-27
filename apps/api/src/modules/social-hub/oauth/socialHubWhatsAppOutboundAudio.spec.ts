import { describe, expect, it } from "vitest";
import {
  isWhatsAppCloudAllowedAudioMime,
  normalizeAudioMimeType,
} from "./socialHubWhatsAppOutboundAudio";

describe("socialHubWhatsAppOutboundAudio", () => {
  it("allows ogg and rejects webm", () => {
    expect(isWhatsAppCloudAllowedAudioMime("audio/ogg")).toBe(true);
    expect(isWhatsAppCloudAllowedAudioMime("audio/ogg; codecs=opus")).toBe(true);
    expect(isWhatsAppCloudAllowedAudioMime("audio/webm")).toBe(false);
    expect(normalizeAudioMimeType("audio/webm;codecs=opus")).toBe("audio/webm");
  });
});
