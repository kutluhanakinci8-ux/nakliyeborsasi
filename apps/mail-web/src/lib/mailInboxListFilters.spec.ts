import { describe, expect, it } from "vitest";
import {
  applyInboxQueryFilters,
  matchesInboxQueryFilter,
} from "./mailInboxListFilters";
import type { MailInboxListItem } from "./mailApi";

const base: MailInboxListItem = {
  id: "1",
  fromAddress: "a@b.com",
  subject: "Test",
  snippet: "hello",
  receivedAt: new Date().toISOString(),
  readAt: null,
  spamStatus: "clean",
};

describe("mailInboxListFilters", () => {
  it("filters unread", () => {
    expect(matchesInboxQueryFilter(base, "unread")).toBe(true);
    expect(
      matchesInboxQueryFilter({ ...base, readAt: new Date().toISOString() }, "unread"),
    ).toBe(false);
  });

  it("filters categorized via inbox category", () => {
    const promo = {
      ...base,
      inboxCategory: "promotions",
      readAt: new Date().toISOString(),
    };
    const plain = { ...base, readAt: new Date().toISOString() };
    expect(matchesInboxQueryFilter(promo, "categorized")).toBe(true);
    expect(matchesInboxQueryFilter(plain, "categorized")).toBe(false);
  });

  it("applies OR across active filters", () => {
    const read = { ...base, readAt: new Date().toISOString(), starredAt: null };
    const out = applyInboxQueryFilters(
      [base, read],
      new Set(["unread", "flagged"]),
      null,
    );
    expect(out.map((m) => m.id)).toEqual(["1"]);
  });
});
