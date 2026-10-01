import { ValidationException } from "@nakliyeborsasi/core";
import { SOCIAL_HUB_ROADMAP_PROVIDERS } from "./socialHubRoadmapProviders";

const ALLOWED = new Set(
  SOCIAL_HUB_ROADMAP_PROVIDERS.map((row) => row.platformCode),
);

export function parseRoadmapInterestPlatformCodes(
  json: string | null | undefined,
): string[] {
  if (!json?.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    const unique = new Set<string>();
    for (const entry of parsed) {
      if (typeof entry !== "string") {
        continue;
      }
      const code = entry.trim().toUpperCase();
      if (ALLOWED.has(code)) {
        unique.add(code);
      }
    }
    return [...unique].sort();
  } catch {
    return [];
  }
}

export function serializeRoadmapInterestPlatformCodes(codes: string[]): string {
  const unique = new Set<string>();
  for (const raw of codes) {
    const code = raw.trim().toUpperCase();
    if (ALLOWED.has(code)) {
      unique.add(code);
    }
  }
  const list = [...unique].sort();
  return JSON.stringify(list);
}

export function assertRoadmapPlatformCode(platformCode: string): string {
  const code = platformCode.trim().toUpperCase();
  if (!ALLOWED.has(code)) {
    throw new ValidationException(
      "Bu kanal yol haritasında değil veya henüz desteklenmiyor.",
    );
  }
  return code;
}
