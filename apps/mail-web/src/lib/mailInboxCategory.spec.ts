import { describe, expect, it } from "vitest";
import {
  inferInboxCategoryHeuristic,
  isCategorizedInboxCategory,
  resolveMessageInboxCategory,
} from "./mailInboxCategory";
import type { MailInboxListItem } from "./mailApi";

const base: MailInboxListItem = {
  id: "1",
  fromAddress: "team@example.com",
  subject: "Hello",
  snippet: "world",
  receivedAt: new Date().toISOString(),
  readAt: null,
  spamStatus: "clean",
};

describe("mailInboxCategory", () => {
  it("infers promotions from noreply senders", () => {
    expect(
      inferInboxCategoryHeuristic({
        ...base,
        fromAddress: "noreply@shop.com",
        subject: "Sale",
      }),
    ).toBe("promotions");
  });

  it("prefers stored category over heuristic", () => {
    const row = { ...base, inboxCategory: "commercial" };
    expect(resolveMessageInboxCategory(row)).toBe("commercial");
  });

  it("categorized filter excludes primary-only rows", () => {
    expect(isCategorizedInboxCategory(null)).toBe(false);
    expect(isCategorizedInboxCategory("promotions")).toBe(true);
  });
});
