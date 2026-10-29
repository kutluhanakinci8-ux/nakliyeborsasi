import { describe, expect, it } from "vitest";
import { LTR_SCHEMA_ID } from "./ltrConstants";
import type { LtrManifest } from "./ltrManifestTypes";
import { renderLtrBlocksHtml, renderLtrDocumentHtml } from "./ltrRenderBlocksHtml";

const sample: LtrManifest = {
  schema: LTR_SCHEMA_ID,
  lang: "tr",
  mode: "sealed",
  title: "Test",
  blocks: [
    { type: "callout", tone: "ok", text: "Tamam" },
    { type: "markdown", md: "## Başlık\nSatır" },
  ],
};

describe("renderLtrBlocksHtml", () => {
  it("renders callout and markdown", () => {
    const html = renderLtrBlocksHtml(sample);
    expect(html).toContain("ltr-callout");
    expect(html).toContain("<h2>Başlık</h2>");
  });
});

describe("renderLtrDocumentHtml", () => {
  it("produces full html document", () => {
    const html = renderLtrDocumentHtml(sample);
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<title>Test</title>");
  });
});
