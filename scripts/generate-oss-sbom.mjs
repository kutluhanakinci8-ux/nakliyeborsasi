#!/usr/bin/env node
/**
 * mail-web istemci bağımlılıkları için SBOM (license-checker + package-lock BFS).
 * Çıktı: docs/oss/mail-web-sbom.json, docs/oss/mail-web-sbom-summary.md
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "docs", "oss");
const mailWebDir = path.join(root, "apps", "mail-web");
const workspace = "@lerta/mail-web";

function loadMailWebRootDeps() {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(mailWebDir, "package.json"), "utf8"),
  );
  return [
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.optionalDependencies ?? {}),
  ];
}

function buildLockIndex(lockPackages) {
  const byName = new Map();
  for (const [pkgPath, meta] of Object.entries(lockPackages)) {
    if (!meta.version) continue;
    const suffix = pkgPath.replace(/^.*node_modules\//, "");
    const name = meta.name ?? suffix;
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push({ pkgPath, version: meta.version, meta });
  }
  return byName;
}

function collectTransitiveNames(lock, rootDepNames) {
  const lockPackages = lock.packages ?? {};
  const byName = buildLockIndex(lockPackages);
  const visited = new Set();
  const queue = [...rootDepNames];

  while (queue.length) {
    const name = queue.shift();
    if (visited.has(name)) continue;
    visited.add(name);
    const entries = byName.get(name) ?? [];
    for (const { meta } of entries) {
      for (const child of Object.keys(meta.dependencies ?? {})) {
        if (!visited.has(child)) queue.push(child);
      }
    }
  }
  return visited;
}

function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const lock = JSON.parse(
    fs.readFileSync(path.join(root, "package-lock.json"), "utf8"),
  );
  const mailWebNames = collectTransitiveNames(lock, loadMailWebRootDeps());

  const checkerRaw = execSync(
    "npx --yes license-checker@25.0.1 --json",
    { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  const checker = JSON.parse(checkerRaw);

  const entries = [];
  for (const [key, meta] of Object.entries(checker)) {
    const name =
      meta.name ?? (key.split("@").slice(0, -1).join("@") || key);
    if (!mailWebNames.has(name)) continue;
    if (name.startsWith("@lerta/") || name.startsWith("@nakliyeborsasi/")) {
      continue;
    }
    entries.push({
      name,
      version: meta.version ?? null,
      licenses: meta.licenses ?? "UNKNOWN",
      repository: meta.repository ?? null,
      path: meta.path ?? null,
    });
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));

  const byLicense = {};
  for (const e of entries) {
    const lic = String(e.licenses);
    byLicense[lic] = (byLicense[lic] || 0) + 1;
  }

  const generatedAt = new Date().toISOString();
  const payload = {
    generatedAt,
    workspace,
    packageCount: entries.length,
    byLicense,
    packages: entries,
  };

  const jsonPath = path.join(outDir, "mail-web-sbom.json");
  fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);

  const lockPackages = lock.packages ?? {};
  function lockVersion(name) {
    const suffix = `node_modules/${name}`;
    for (const [pkgPath, meta] of Object.entries(lockPackages)) {
      if (pkgPath.endsWith(suffix) && meta.version) return meta.version;
    }
    return null;
  }

  const mdLines = [
    "# mail-web SBOM özeti",
    "",
    `Oluşturulma: ${generatedAt}`,
    "",
    `Toplam paket: **${entries.length}** (lockfile BFS, mail-web kök bağımlılıkları)`,
    "",
    "## Lisans dağılımı",
    "",
    ...Object.entries(byLicense)
      .sort((a, b) => b[1] - a[1])
      .map(([lic, n]) => `- ${lic}: ${n}`),
    "",
    "## W1 katalog paketleri (manuel ekran)",
    "",
    "| Paket | lockfile | SBOM lisans |",
    "|-------|----------|-------------|",
  ];
  const w1 = [
    "@fragaria/address-formatter",
    "next",
    "openpgp",
    "react",
    "react-dom",
    "@simplewebauthn/browser",
    "fzstd",
    "zstd-codec",
  ];
  for (const pkg of w1) {
    const row = entries.find((e) => e.name === pkg);
    mdLines.push(
      `| ${pkg} | ${lockVersion(pkg) ?? "—"} | ${row?.licenses ?? "—"} |`,
    );
  }
  mdLines.push("", `Tam liste: \`mail-web-sbom.json\``, "");
  fs.writeFileSync(path.join(outDir, "mail-web-sbom-summary.md"), mdLines.join("\n"));

  console.log(
    `OK: ${entries.length} packages (${mailWebNames.size} in lock BFS) → ${jsonPath}`,
  );
}

main();
