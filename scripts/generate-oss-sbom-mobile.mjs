#!/usr/bin/env node
/**
 * apps/mobile (ayrı lockfile) SBOM → docs/oss/mobile-sbom.json
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mobileDir = path.join(root, "apps", "mobile");
const outDir = path.join(root, "docs", "oss");
const lockPath = path.join(mobileDir, "package-lock.json");

if (!fs.existsSync(lockPath)) {
  console.log("apps/mobile: npm install (ilk lockfile)…");
  execSync("npm install", { cwd: mobileDir, stdio: "inherit" });
}

function loadRootDeps() {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(mobileDir, "package.json"), "utf8"),
  );
  return Object.keys(pkg.dependencies ?? {});
}

function buildLockIndex(lockPackages) {
  const byName = new Map();
  for (const [pkgPath, meta] of Object.entries(lockPackages)) {
    if (!meta.version) continue;
    const name = meta.name ?? pkgPath.replace(/^.*node_modules\//, "");
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push(meta);
  }
  return byName;
}

function collectTransitive(lock) {
  const lockPackages = lock.packages ?? {};
  const byName = buildLockIndex(lockPackages);
  const visited = new Set();
  const queue = [...loadRootDeps()];
  while (queue.length) {
    const name = queue.shift();
    if (visited.has(name)) continue;
    visited.add(name);
    for (const meta of byName.get(name) ?? []) {
      for (const child of Object.keys(meta.dependencies ?? {})) {
        if (!visited.has(child)) queue.push(child);
      }
    }
  }
  return visited;
}

function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  const names = collectTransitive(lock);

  const checkerRaw = execSync(
    "npx --yes license-checker@25.0.1 --json",
    { cwd: mobileDir, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  const checker = JSON.parse(checkerRaw);

  const entries = [];
  for (const [key, meta] of Object.entries(checker)) {
    const name =
      meta.name ?? (key.split("@").slice(0, -1).join("@") || key);
    if (!names.has(name)) continue;
    entries.push({
      name,
      version: meta.version ?? null,
      licenses: meta.licenses ?? "UNKNOWN",
      repository: meta.repository ?? null,
    });
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));

  const generatedAt = new Date().toISOString();
  const payload = {
    generatedAt,
    app: "mobile",
    workspace: "@nakliyeborsasi/mobile",
    packageCount: entries.length,
    packages: entries,
  };

  const jsonPath = path.join(outDir, "mobile-sbom.json");
  fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(
    path.join(outDir, "mobile-sbom-summary.md"),
    [
      "# mobile SBOM özeti",
      "",
      `Oluşturulma: ${generatedAt}`,
      "",
      `Toplam paket: **${entries.length}**`,
      "",
      `Tam liste: \`mobile-sbom.json\``,
      "",
    ].join("\n"),
  );
  console.log(`OK: ${entries.length} mobile packages → ${jsonPath}`);
}

main();
