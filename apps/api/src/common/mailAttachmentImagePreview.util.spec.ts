import { describe, expect, it } from "vitest";
import {
  createMailAttachmentImagePreview,
  isPreviewableMailAttachmentContentType,
} from "./mailAttachmentImagePreview.util";

describe("mailAttachmentImagePreview", () => {
  it("detects image content types", () => {
    expect(isPreviewableMailAttachmentContentType("image/png")).toBe(true);
    expect(isPreviewableMailAttachmentContentType("application/pdf")).toBe(
      false,
    );
  });

  it("resizes a tiny png", async () => {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    const out = await createMailAttachmentImagePreview(png, 64);
    expect(out.length).toBeGreaterThan(100);
    expect(out[0]).toBe(0xff);
    expect(out[1]).toBe(0xd8);
  });
});
