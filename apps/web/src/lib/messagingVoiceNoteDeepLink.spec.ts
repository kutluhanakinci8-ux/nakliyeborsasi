import { describe, expect, it } from "vitest";
import {
  isMessagingVoiceNoteDeepLink,
  stripMessagingVoiceNoteDeepLinkParam,
} from "./messagingVoiceNoteDeepLink";

describe("messagingVoiceNoteDeepLink", () => {
  it("detects voiceNote=1", () => {
    expect(
      isMessagingVoiceNoteDeepLink(new URLSearchParams("tab=chat&voiceNote=1")),
    ).toBe(true);
    expect(
      isMessagingVoiceNoteDeepLink(new URLSearchParams("voiceNote=0")),
    ).toBe(false);
  });

  it("strips voiceNote param", () => {
    const next = stripMessagingVoiceNoteDeepLinkParam(
      new URLSearchParams("tab=chat&threadId=abc&voiceNote=1"),
    );
    expect(next.toString()).toBe("tab=chat&threadId=abc");
  });
});
