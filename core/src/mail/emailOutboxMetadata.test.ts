import { describe, expect, it } from "vitest";
import { readOrganizationIdFromOutboxMetadata } from "./emailOutboxMetadata";

describe("readOrganizationIdFromOutboxMetadata", () => {
  it("prefers organizationId", () => {
    expect(
      readOrganizationIdFromOutboxMetadata({
        organizationId: "org-1",
        companyId: "org-2",
      }),
    ).toBe("org-1");
  });

  it("falls back to companyId", () => {
    expect(readOrganizationIdFromOutboxMetadata({ companyId: "co-9" })).toBe(
      "co-9",
    );
  });
});
