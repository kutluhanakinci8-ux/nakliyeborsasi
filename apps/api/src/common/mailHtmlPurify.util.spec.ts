import { describe, expect, it } from "vitest";
import {
  sanitizeInboundHtmlWithPurify,
  sanitizeOutboundHtmlWithPurify,
} from "./mailHtmlPurify.util";

describe("mailHtmlPurify", () => {
  it("strips script from inbound html", () => {
    const out = sanitizeInboundHtmlWithPurify(
      '<p>Hi</p><script>alert(1)</script>',
    );
    expect(out).toContain("Hi");
    expect(out.toLowerCase()).not.toContain("script");
  });

  it("strips inline handlers from outbound html", () => {
    const out = sanitizeOutboundHtmlWithPurify(
      '<p onclick="evil()">x</p>',
    );
    expect(out).toContain("x");
    expect(out).not.toMatch(/onclick/i);
  });
});
