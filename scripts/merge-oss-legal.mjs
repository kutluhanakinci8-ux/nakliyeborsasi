#!/usr/bin/env node
/**
 * Web katalog (TS) + mobile SBOM → docs/oss/lerta-legal-notices.json
 * Mobil uygulama: apps/mobile/assets/lerta-legal-notices.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const libDir = path.join(root, "apps/mail-web/src/lib");
const catalogFiles = [
  "mailOpenSourceLicensesCatalog.ts",
  "mailOpenSourceLicensesCatalogW2.ts",
  "mailOpenSourceLicensesCatalogW3.ts",
  "mailOpenSourceLicensesCatalogW4.ts",
  "mailOpenSourceLicensesCatalogW5.ts",
  "mailOpenSourceLicensesCatalogW6.ts",
];

function parseCatalogEntries(src) {
  const entries = [];
  const re =
    /id:\s*"([^"]+)"[\s\S]*?sortName:\s*"([^"]+)"[\s\S]*?packageName:\s*"([^"]+)"[\s\S]*?licenseShort:\s*"([^"]+)"[\s\S]*?usageNoteKey:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    entries.push({
      id: m[1],
      sortName: m[2],
      packageName: m[3],
      licenseShort: m[4],
      usageNoteKey: m[5],
      surface: "web-legal",
    });
  }
  return entries;
}

function loadWebCatalog() {
  const all = [];
  for (const file of catalogFiles) {
    const p = path.join(libDir, file);
    if (!fs.existsSync(p)) continue;
    all.push(...parseCatalogEntries(fs.readFileSync(p, "utf8")));
  }
  const byId = new Map();
  for (const e of all) {
    byId.set(e.id, e);
  }
  return [...byId.values()].sort((a, b) =>
    a.sortName.localeCompare(b.sortName, "tr"),
  );
}

function loadMobileSbom() {
  const p = path.join(root, "docs/oss/mobile-sbom.json");
  if (!fs.existsSync(p)) {
    return [];
  }
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  return (data.packages ?? []).map((pkg) => ({
    name: pkg.name,
    version: pkg.version,
    licenses: pkg.licenses,
    surface: "mobile-npm",
  }));
}

function loadRegistry() {
  const p = path.join(root, "docs/oss/lerta-oss-registry.json");
  if (!fs.existsSync(p)) return [];
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  return (data.entries ?? []).filter(
    (e) => e.status === "done" || e.phase === "W6",
  );
}

function main() {
  const generatedAt = new Date().toISOString();
  const payload = {
    generatedAt,
    version: 1,
    description:
      "Lerta birleşik Legal — posta web kataloğu + mobil npm SBOM (W6)",
    webCatalog: loadWebCatalog(),
    mobilePackages: loadMobileSbom(),
    registry: loadRegistry(),
  };

  const outDocs = path.join(root, "docs/oss/lerta-legal-notices.json");
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  fs.writeFileSync(outDocs, json);

  const assetsDir = path.join(root, "apps/mobile/assets");
  fs.mkdirSync(assetsDir, { recursive: true });
  fs.writeFileSync(path.join(assetsDir, "lerta-legal-notices.json"), json);

  console.log(
    `OK: legal merge — ${payload.webCatalog.length} web catalog, ${payload.mobilePackages.length} mobile npm → ${outDocs}`,
  );
}

main();
