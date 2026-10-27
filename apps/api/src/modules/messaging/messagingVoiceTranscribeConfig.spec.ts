import { describe, expect, it } from "vitest";
import {
  messagingVoiceSttConfigured,
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

  it("auth optional without key when local enabled", () => {
    const env = {
      MESSAGING_VOICE_STT_LOCAL_ENABLED: "1",
      MESSAGING_VOICE_STT_API_URL: "http://127.0.0.1:9010/v1/audio/transcriptions",
      MESSAGING_VOICE_STT_AUTH_OPTIONAL: "1",
    };
    expect(messagingVoiceSttConfigured(env)).toBe(true);
  });
});
