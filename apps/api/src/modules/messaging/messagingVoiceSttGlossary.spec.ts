import { describe, expect, it } from "vitest";
import {
  applyMessagingVoiceSttGlossary,
  resolveMessagingVoiceSttLanguage,
} from "./messagingVoiceSttGlossary";
import { messagingVoiceSttDefaultLanguage } from "./messagingVoiceTranscribeConfig";

describe("messagingVoiceSttGlossary", () => {
  it("applies built-in logistics replacements", () => {
    const out = applyMessagingVoiceSttGlossary("cmr ve adr ile tır yükü");
    expect(out).toContain("CMR");
    expect(out).toContain("ADR");
    expect(out).toContain("TIR");
  });

  it("uses explicit language over locale", () => {
    expect(resolveMessagingVoiceSttLanguage("tr-TR", "en")).toBe("en");
  });

  it("falls back to MESSAGING_VOICE_STT_DEFAULT_LANGUAGE", () => {
    const env = { MESSAGING_VOICE_STT_DEFAULT_LANGUAGE: "tr" };
    expect(
      resolveMessagingVoiceSttLanguage("de-DE", null, env),
    ).toBe("tr");
    expect(messagingVoiceSttDefaultLanguage(env)).toBe("tr");
  });

  it("maps Turkish locale when no default env", () => {
    expect(resolveMessagingVoiceSttLanguage("tr-TR", null, {})).toBe("tr");
  });
});
