import { describe, expect, it } from "vitest";
import {
  buildLocalWhisperAsrRequestUrl,
  parseLocalWhisperAsrResponseBody,
  resolveLocalWhisperAsrUrl,
} from "./messagingVoiceSttLocalAsr";

describe("messagingVoiceSttLocalAsr", () => {
  it("rewrites OpenAI path to /asr", () => {
    expect(
      resolveLocalWhisperAsrUrl(
        "http://127.0.0.1:9010/v1/audio/transcriptions",
      ),
    ).toBe("http://127.0.0.1:9010/asr");
  });

  it("builds query with language", () => {
    const url = buildLocalWhisperAsrRequestUrl(
      "http://127.0.0.1:9010/asr",
      "tr",
    );
    expect(url).toContain("/asr?");
    expect(url).toContain("language=tr");
    expect(url).toContain("output=json");
  });

  it("parses json text field", () => {
    expect(
      parseLocalWhisperAsrResponseBody('{"text":"merhaba"}'),
    ).toBe("merhaba");
  });
});
