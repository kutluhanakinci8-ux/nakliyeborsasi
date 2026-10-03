import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  extractHtmlBodyFromMime,
  readMimeHeaderValue,
} from "./MailMimePartParser";
import { reparseInboundDisplayFromRawMime } from "./MailInboundMimeParse";

describe("MailMimePartParser", () => {
  it("reads Content-Type from real headers, not DKIM h= list", () => {
    const sample = readFileSync(
      join(__dirname, "fixtures", "instagram-verify-profile.eml"),
      "latin1",
    );
    const headEnd = sample.search(/\r?\n\r?\n/);
    const head = sample.slice(0, headEnd);
    expect(readMimeHeaderValue(head, "Content-Type")).toMatch(/text\/html/i);
    const html = extractHtmlBodyFromMime(sample);
    expect(html).toBeTruthy();
    expect(html).toMatch(/instagram|verification|confirm/i);
    const reparsed = reparseInboundDisplayFromRawMime(sample);
    expect(reparsed.bodyHtml).toBeTruthy();
    expect(reparsed.bodyHtml).toMatch(/<html/i);
  });
});
