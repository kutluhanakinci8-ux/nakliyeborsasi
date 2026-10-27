import { readFileSync } from "node:fs";
import {
  messagingVoiceSttDefaultLanguage,
  messagingVoiceSttGlossaryPath,
} from "./messagingVoiceTranscribeConfig";

/** Lojistik STT düzeltmeleri (basit sözlük — STT-2 / OSS-3). */
const BUILTIN_REPLACEMENTS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bcmr\b/gi, replacement: "CMR" },
  { pattern: /\badr\b/gi, replacement: "ADR" },
  { pattern: /\btır\b/gi, replacement: "TIR" },
  { pattern: /\bfcl\b/gi, replacement: "FCL" },
  { pattern: /\blcl\b/gi, replacement: "LCL" },
  { pattern: /\byük\s*veren\b/gi, replacement: "yükveren" },
];

type GlossaryFileRule = {
  pattern?: string;
  replacement?: string;
  flags?: string;
};

let cachedFileRules: Array<{ pattern: RegExp; replacement: string }> | null =
  null;
let cachedFilePath: string | null = null;

function loadFileGlossaryRules(
  env: NodeJS.ProcessEnv = process.env,
): Array<{ pattern: RegExp; replacement: string }> {
  const path = messagingVoiceSttGlossaryPath(env);
  if (!path) {
    return [];
  }
  if (cachedFilePath === path && cachedFileRules) {
    return cachedFileRules;
  }
  try {
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw) as GlossaryFileRule[];
    if (!Array.isArray(parsed)) {
      cachedFilePath = path;
      cachedFileRules = [];
      return [];
    }
    const rules: Array<{ pattern: RegExp; replacement: string }> = [];
    for (const row of parsed) {
      const pattern = row.pattern?.trim();
      const replacement = row.replacement ?? "";
      if (!pattern) {
        continue;
      }
      const flags = row.flags?.trim() || "g";
      rules.push({
        pattern: new RegExp(pattern, flags || "gi"),
        replacement,
      });
    }
    cachedFilePath = path;
    cachedFileRules = rules;
    return rules;
  } catch {
    cachedFilePath = path;
    cachedFileRules = [];
    return [];
  }
}

export function messagingVoiceSttGlossaryRuleCount(
  env: NodeJS.ProcessEnv = process.env,
): number {
  return BUILTIN_REPLACEMENTS.length + loadFileGlossaryRules(env).length;
}

export function applyMessagingVoiceSttGlossary(
  text: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  let out = text;
  const rules = [...BUILTIN_REPLACEMENTS, ...loadFileGlossaryRules(env)];
  for (const rule of rules) {
    out = out.replace(rule.pattern, rule.replacement);
  }
  return out;
}

export function resolveMessagingVoiceSttLanguage(
  locale: string,
  explicit?: string | null,
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const fromExplicit = explicit?.trim().toLowerCase();
  if (fromExplicit) {
    if (fromExplicit.startsWith("tr")) {
      return "tr";
    }
    if (fromExplicit.startsWith("uk") || fromExplicit.startsWith("ua")) {
      return "uk";
    }
    if (fromExplicit.startsWith("en")) {
      return "en";
    }
    return fromExplicit.slice(0, 8);
  }
  const raw = locale.trim().toLowerCase();
  if (raw.startsWith("tr")) {
    return "tr";
  }
  if (raw.startsWith("uk") || raw.startsWith("ua")) {
    return "uk";
  }
  if (raw.startsWith("en")) {
    return "en";
  }
  const fallback = messagingVoiceSttDefaultLanguage(env);
  return fallback ?? undefined;
}
