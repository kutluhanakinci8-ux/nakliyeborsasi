import { describe, expect, it } from "vitest";
import { buildCopyableMessageText } from "./messagingMessageCopy";

describe("buildCopyableMessageText", () => {
  it("returns body text", () => {
    expect(
      buildCopyableMessageText({ bodyText: "  merhaba  ", deleted: false }),
    ).toBe("merhaba");
  });

  it("prefers translation overlay", () => {
    expect(
      buildCopyableMessageText({
        bodyText: "TR",
        translationOverlay: "EN",
      }),
    ).toBe("EN");
  });

  it("uses voice transcript when body is placeholder", () => {
    expect(
      buildCopyableMessageText({
        bodyText: "🎤 Sesli mesaj",
        attachments: [
          {
            index: 0,
            filename: "v.webm",
            contentType: "audio/webm",
            sizeBytes: 100,
            transcript: { status: "ready", text: "yük teslim edildi" },
          },
        ],
      }),
    ).toBe("yük teslim edildi");
  });

  it("returns null when deleted", () => {
    expect(
      buildCopyableMessageText({ bodyText: "x", deleted: true }),
    ).toBeNull();
  });
});
