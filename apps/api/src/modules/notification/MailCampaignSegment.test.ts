import { describe, expect, it } from "vitest";
import { recipientMatchesCampaignSegment } from "./MailCampaignSegment";

describe("recipientMatchesCampaignSegment", () => {
  it("matches referans allowlist", () => {
    expect(
      recipientMatchesCampaignSegment(
        { referans: "REF-002" },
        { referansAllowlist: ["REF-001", "REF-002"] },
      ),
    ).toBe(true);
    expect(
      recipientMatchesCampaignSegment(
        { referans: "REF-999" },
        { referansAllowlist: ["REF-001"] },
      ),
    ).toBe(false);
  });
});
