import { describe, expect, it } from "vitest";
import {
  messagingVoiceSttConfigured,
  messagingVoiceSttDefaultLanguage,
  messagingVoiceSttOssGateFaz7Enabled,
  resolveMessagingVoiceSttApiKey,
  resolveMessagingVoiceSttProvider,
} from "./messagingVoiceTranscribeConfig";

describe("messagingVoiceTranscribeConfig", () => {
  it("local STT with dedicated key", () => {
    const env = {
      MESSAGING_VOICE_STT_LOCAL_ENABLED: "1",
      MESSAGING_VOICE_STT_API_URL: "http://127.0.0.1:9010/v1/audio/transcriptions",
      MESSAGING_VOICE_STT_API_KEY: "local-stt-internal",
    };
    expect(messagingVoiceSttConfigured(env)).toBe(true);
    expect(resolveMessagingVoiceSttProvider(env)).toBe("local");
    expect(resolveMessagingVoiceSttApiKey(env)).toBe("local-stt-internal");
  });

  it("OSS gate faz7 flag", () => {
    expect(
      messagingVoiceSttOssGateFaz7Enabled({
        MESSAGING_VOICE_STT_OSS_GATE_FAZ7: "1",
      }),
    ).toBe(true);
  });

  it("default language tr (OSS-3)", () => {
    expect(
      messagingVoiceSttDefaultLanguage({
        MESSAGING_VOICE_STT_DEFAULT_LANGUAGE: "tr",
      }),
    ).toBe("tr");
  });

  it("auth optional without key when local enabled", () => {
    const env = {
      MESSAGING_VOICE_STT_LOCAL_ENABLED: "1",
      MESSAGING_VOICE_STT_API_URL: "http://127.0.0.1:9010/v1/audio/transcriptions",
      MESSAGING_VOICE_STT_AUTH_OPTIONAL: "1",
    };
    expect(messagingVoiceSttConfigured(env)).toBe(true);
  });
});
