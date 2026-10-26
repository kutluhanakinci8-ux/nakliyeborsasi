#!/usr/bin/env node
/**
 * W1–W2 lisans kataloğu ↔ package-lock uyumu.
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

const catalogFiles = [
  "mailOpenSourceLicensesCatalog.ts",
  "mailOpenSourceLicensesCatalogW2.ts",
  "mailOpenSourceLicensesCatalogW3.ts",
  "mailOpenSourceLicensesCatalogW4.ts",
  "mailOpenSourceLicensesCatalogW5.ts",
  "mailOpenSourceLicensesCatalogW6.ts",
  "mailOpenSourceLicensesCatalogW7.ts",
  "mailOpenSourceLicensesCatalogW8.ts",
];
const ids = [];
for (const file of catalogFiles) {
  const src = fs.readFileSync(
    path.join(root, "apps/mail-web/src/lib", file),
    "utf8",
  );
  ids.push(...[...src.matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]));
}
const expectedIds = new Set([
  "address-formatting",
  "nextjs",
  "openpgp",
  "react",
  "simplewebauthn",
  "zlib",
  "zstandard",
  "brotli",
  "libphonenumber-js",
  "utf7-imap",
  "dompurify",
  "web-push",
  "ws",
  "nodemailer",
  "zstd-node-api",
  "leaflet",
  "expo",
  "react-native",
  "expo-auth-session",
  "sharp",
  "browser-webrtc",
  "expo-notifications",
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
function extractPackageList(src, constName) {
  const m = src.match(
    new RegExp(`${constName}\\s*=\\s*\\[([\\s\\S]*?)\\]`),
  );
  return m ? [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : [];
}

const serverPackages = extractPackageList(
  catalogSrc,
  "OSS_CATALOG_SERVER_PACKAGE_NAMES",
);
const webPackages = extractPackageList(
  catalogSrc,
  "OSS_CATALOG_WEB_PACKAGE_NAMES",
);
const mobilePackages = extractPackageList(
  catalogSrc,
  "OSS_CATALOG_MOBILE_PACKAGE_NAMES",
);
const mobileLockPath = path.join(root, "apps/mobile/package-lock.json");
let mobileLockPackages = {};
if (fs.existsSync(mobileLockPath)) {
  mobileLockPackages =
    JSON.parse(fs.readFileSync(mobileLockPath, "utf8")).packages ?? {};
}

function resolveMobileLockVersion(name) {
  const suffix = `node_modules/${name}`;
  for (const [pkgPath, meta] of Object.entries(mobileLockPackages)) {
    if (pkgPath.endsWith(suffix) && meta.version) return meta.version;
    if (meta.name === name && meta.version) return meta.version;
  }
  return null;
}

for (const name of serverPackages) {
  const version = resolveLockVersion(name);
  if (!version) {
    console.error(`FAIL: server catalog package ${name} not in package-lock`);
    failed = true;
    continue;
  }
  console.log(`OK (server): ${name}@${version}`);
}

for (const name of webPackages) {
  const version = resolveLockVersion(name);
  if (!version) {
    console.error(`FAIL: web catalog package ${name} not in package-lock`);
    failed = true;
    continue;
  }
  console.log(`OK (web): ${name}@${version}`);
}

for (const name of mobilePackages) {
  const version = resolveMobileLockVersion(name);
  if (!version) {
    console.error(
      `FAIL: mobile catalog package ${name} not in apps/mobile/package-lock (run npm install in apps/mobile)`,
    );
    failed = true;
    continue;
  }
  console.log(`OK (mobile): ${name}@${version}`);
}

if (failed) process.exit(1);

if (ids.length < 22) {
  console.error(`FAIL: expected at least 22 catalog ids, got ${ids.length}`);
  process.exit(1);
}
console.log(
  `OK: ${ids.length} catalog entries, ${packages.length} client deps, ${serverPackages.length} server deps, ${webPackages.length} web deps, ${mobilePackages.length} mobile deps`,
);
