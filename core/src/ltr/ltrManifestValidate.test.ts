import { describe, expect, it } from "vitest";
import { LTR_SCHEMA_ID } from "./ltrConstants";
import {
  extractLtrManifestJsonFromHtml,
  validateLtrManifest,
} from "./ltrManifestValidate";

describe("validateLtrManifest", () => {
  it("accepts minimal sealed manifest", () => {
    const result = validateLtrManifest({
      schema: LTR_SCHEMA_ID,
      lang: "tr",
      mode: "sealed",
      title: "Örnek teklif",
      blocks: [{ type: "markdown", md: "Merhaba" }],
    });
    expect(result.ok).toBe(true);
  });

  it("rejects wrong schema", () => {
    const result = validateLtrManifest({
      schema: "other/1.0",
      lang: "tr",
      mode: "sealed",
      title: "X",
      blocks: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.path === "schema")).toBe(true);
    }
  });
});

describe("extractLtrManifestJsonFromHtml", () => {
  it("parses embedded script", () => {
    const html = `<!doctype html><html><head><script type="application/ltr+json" id="ltr-content">{"schema":"lerta/ltr/1.0","lang":"tr","mode":"sealed","title":"T","blocks":[]}</script></head><body></body></html>`;
    const json = extractLtrManifestJsonFromHtml(html);
    expect(json).toMatchObject({ title: "T" });
  });
});
