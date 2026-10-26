import { describe, expect, it } from "vitest";
import {
  decodeImapModifiedUtf7MailboxName,
  encodeImapModifiedUtf7MailboxName,
  maildirSegmentForCustomFolder,
} from "./mailImapModifiedUtf7.util";

describe("mailImapModifiedUtf7", () => {
  it("encodes Turkish folder names for IMAP LIST", () => {
    const encoded = encodeImapModifiedUtf7MailboxName("İş");
    expect(encoded).not.toBe("İş");
    expect(decodeImapModifiedUtf7MailboxName(encoded)).toBe("İş");
  });

  it("leaves ASCII names unchanged", () => {
    expect(encodeImapModifiedUtf7MailboxName("Projects")).toBe("Projects");
  });

  it("builds stable maildir segment from folder id", () => {
    expect(maildirSegmentForCustomFolder("abc-123")).toBe(
      ".lerta-custom-abc-123",
    );
  });
});
