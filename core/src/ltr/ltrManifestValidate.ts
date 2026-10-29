import {
  LTR_MODES,
  LTR_SCHEMA_ID,
  type LtrDistributionMode,
} from "./ltrConstants";
import type { LtrManifest } from "./ltrManifestTypes";

export type LtrManifestValidationIssue = {
  path: string;
  message: string;
};

export type LtrManifestValidationResult =
  | { ok: true; manifest: LtrManifest }
  | { ok: false; issues: LtrManifestValidationIssue[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pushIssue(
  issues: LtrManifestValidationIssue[],
  path: string,
  message: string,
): void {
  issues.push({ path, message });
}

function parseMode(value: unknown): LtrDistributionMode | null {
  if (typeof value !== "string") {
    return null;
  }
  return LTR_MODES.includes(value as LtrDistributionMode)
    ? (value as LtrDistributionMode)
    : null;
}

/**
 * F0 doğrulama — tam JSON Schema yerine zorunlu alanlar.
 * F1'de schema dosyası ile hizalanacak.
 */
export function validateLtrManifest(input: unknown): LtrManifestValidationResult {
  const issues: LtrManifestValidationIssue[] = [];

  if (!isRecord(input)) {
    return { ok: false, issues: [{ path: "", message: "Manifest nesne olmalı." }] };
  }

  if (input.schema !== LTR_SCHEMA_ID) {
    pushIssue(issues, "schema", `Beklenen ${LTR_SCHEMA_ID}.`);
  }

  if (typeof input.lang !== "string" || input.lang.length < 2) {
    pushIssue(issues, "lang", "lang en az 2 karakter olmalı.");
  }

  const mode = parseMode(input.mode);
  if (!mode) {
    pushIssue(issues, "mode", `mode şunlardan biri olmalı: ${LTR_MODES.join(", ")}.`);
  }

  if (typeof input.title !== "string" || !input.title.trim()) {
    pushIssue(issues, "title", "title zorunlu.");
  }

  if (!Array.isArray(input.blocks)) {
    pushIssue(issues, "blocks", "blocks dizi olmalı.");
  } else {
    input.blocks.forEach((block, index) => {
      if (!isRecord(block) || typeof block.type !== "string" || !block.type.trim()) {
        pushIssue(issues, `blocks[${index}].type`, "Her blok type alanı içermeli.");
      }
    });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    manifest: input as unknown as LtrManifest,
  };
}

/** Mühürlü HTML içinden manifest JSON çıkarımı (F1 viewer ile paylaşılır). */
export function extractLtrManifestJsonFromHtml(html: string): unknown | null {
  const id = 'id="ltr-content"';
  const start = html.indexOf(id);
  if (start === -1) {
    return null;
  }
  const openTagEnd = html.indexOf(">", start);
  if (openTagEnd === -1) {
    return null;
  }
  const close = html.indexOf("</script>", openTagEnd);
  if (close === -1) {
    return null;
  }
  const raw = html.slice(openTagEnd + 1, close).trim();
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}
