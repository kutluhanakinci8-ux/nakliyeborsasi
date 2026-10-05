import { readFileSync } from "node:fs";
import { join } from "node:path";
import { reparseInboundDisplayFromRawMime } from "./MailInboundMimeParse";
import { extractInstagramVerificationCode } from "./instagramVerificationMail";

describe("extractInstagramVerificationCode", () => {
  it("extracts code from instagram-verify-profile fixture", () => {
    const sample = readFileSync(
      join(__dirname, "fixtures", "instagram-verify-profile.eml"),
      "latin1",
    );
    const reparsed = reparseInboundDisplayFromRawMime(sample);
    const code = extractInstagramVerificationCode({
      fromAddress: "security@mail.instagram.com",
      subject: "Verify your profile",
      bodyText: reparsed.bodyText,
      bodyHtml: reparsed.bodyHtml,
    });
    expect(code).toBe("274387");
  });
});
