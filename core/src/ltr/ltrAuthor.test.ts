import { describe, expect, it } from "vitest";
import { createLtrFromAuthorTemplate } from "./ltrAuthorTemplates";
import { extractLtrManifestJsonFromHtml, validateLtrManifest } from "./ltrManifestValidate";
import { sealLtrDocumentHtml } from "./ltrSealDocument";

describe("sealLtrDocumentHtml", () => {
  it("embeds manifest script readable by extract", () => {
    const manifest = createLtrFromAuthorTemplate("teklif", { title: "Seal test" });
    const html = sealLtrDocumentHtml(manifest);
    expect(html).toContain('id="ltr-content"');
    const json = extractLtrManifestJsonFromHtml(html);
    const validated = validateLtrManifest(json);
    expect(validated.ok).toBe(true);
    if (validated.ok) {
      expect(validated.manifest.title).toBe("Seal test");
    }
  });
});

describe("createLtrFromAuthorTemplate", () => {
  it("provides three logistics templates", () => {
    for (const id of ["teklif", "kapasite", "rota"] as const) {
      const m = createLtrFromAuthorTemplate(id);
      expect(validateLtrManifest(m).ok).toBe(true);
    }
  });
});
