#!/usr/bin/env node
/**
 * W1 lisans kataloğu ↔ package-lock uyumu.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = path.join(
  root,
  "apps/mail-web/src/lib/mailOpenSourceLicenses.ts",
);
const lockPath = path.join(root, "package-lock.json");

const catalogSrc = fs.readFileSync(catalogPath, "utf8");
const requiredMatch = catalogSrc.match(
  /OSS_CATALOG_REQUIRED_PACKAGE_NAMES\s*=\s*\[([\s\S]*?)\]/,
);
if (!requiredMatch) {
  console.error("FAIL: OSS_CATALOG_REQUIRED_PACKAGE_NAMES not found");
  process.exit(1);
}
const packages = [...requiredMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);

const idsMatch = fs.readFileSync(
  path.join(root, "apps/mail-web/src/lib/mailOpenSourceLicensesCatalog.ts"),
  "utf8",
);
const ids = [...idsMatch.matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]);
const expectedIds = new Set([
  "address-formatting",
  "nextjs",
  "openpgp",
  "react",
  "simplewebauthn",
  "zlib",
  "zstandard",
]);
for (const id of expectedIds) {
  if (!ids.includes(id)) {
    console.error(`FAIL: missing catalog id ${id}`);
    process.exit(1);
  }
}

const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
const lockPackages = lock.packages ?? {};

function resolveLockVersion(name) {
  const suffix = `node_modules/${name}`;
  const direct = lockPackages[suffix];
  if (direct?.version) return direct.version;
  for (const [pkgPath, meta] of Object.entries(lockPackages)) {
    if (pkgPath.endsWith(suffix) && meta.version) return meta.version;
    if (meta.name === name && meta.version) return meta.version;
  }
  return null;
}

let failed = false;
for (const name of packages) {
  const version = resolveLockVersion(name);
  if (!version) {
    console.error(`FAIL: ${name} not in package-lock`);
    failed = true;
    continue;
  }
  console.log(`OK: ${name}@${version}`);
}

if (failed) process.exit(1);
if (ids.length < 7) {
  console.error(`FAIL: expected at least 7 catalog ids, got ${ids.length}`);
  process.exit(1);
}
console.log(`OK: ${ids.length} catalog entries, ${packages.length} required deps`);
