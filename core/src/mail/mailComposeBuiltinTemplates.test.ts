import { describe, expect, it } from "vitest";
import {
  BUILTIN_MAIL_COMPOSE_TEMPLATES,
  isBuiltinMailComposePresetId,
  listBuiltinMailComposeTemplateDtos,
} from "./mailComposeBuiltinTemplates";

describe("mailComposeBuiltinTemplates", () => {
  it("exposes eight logistics templates", () => {
    expect(BUILTIN_MAIL_COMPOSE_TEMPLATES).toHaveLength(8);
    const slugs = new Set(BUILTIN_MAIL_COMPOSE_TEMPLATES.map((t) => t.slug));
    expect(slugs.has("yuk-teklifi")).toBe(true);
    expect(slugs.has("tanisma")).toBe(true);
  });

  it("maps builtin ids with prefix", () => {
    expect(isBuiltinMailComposePresetId("builtin:yuk-teklifi")).toBe(true);
    expect(isBuiltinMailComposePresetId("custom:1")).toBe(false);
    const dtos = listBuiltinMailComposeTemplateDtos();
    expect(dtos).toHaveLength(8);
    expect(dtos[0]?.id.startsWith("builtin:")).toBe(true);
    expect(dtos.every((d) => d.isSystem)).toBe(true);
  });
});
