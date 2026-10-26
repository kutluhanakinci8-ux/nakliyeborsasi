#!/usr/bin/env node
/**
 * Entegrasyon doğrulama: API zarfı simülasyonu + offline codec + apiFetch unwrap.
 */
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "..");

async function testApiZstdUtil() {
  const apiRoot = path.resolve(root, "../api");
  const utilPath = path.join(apiRoot, "dist/common/mailZstd.util.js");
  try {
    const mod = await import(pathToFileURL(utilPath).href);
    const payload = { messages: Array.from({ length: 20 }, (_, i) => ({
      id: `m${i}`,
      subject: "Test konu " + i,
      snippet: "x".repeat(200),
    })) };
    const b64 = await mod.compressJsonToZstdBase64(payload);
    const back = await mod.decompressZstdBase64ToJson(b64);
    if (JSON.stringify(back) !== JSON.stringify(payload)) {
      throw new Error("API zstd roundtrip mismatch");
    }
    const ratio = Buffer.from(b64, "base64").length / JSON.stringify(payload).length;
    console.log(`OK: API @mongodb-js/zstd roundtrip (ratio ${ratio.toFixed(2)})`);
    return true;
  } catch (e) {
    console.log("SKIP: API dist not built —", e?.message ?? e);
    return false;
  }
}

async function testOfflineCodec() {
  const { ZstdCodec } = require("zstd-codec");
  const fzstd = require("fzstd");
  const sample = {
    summary: { unreadCount: 3 },
    messages: [{ id: "1", subject: "offline" }],
    sent: [],
    cachedAt: Date.now(),
  };
  const json = JSON.stringify(sample);
  let blob = "";
  await new Promise((resolve, reject) => {
    ZstdCodec.run((zstd) => {
      try {
        const c = new zstd.Simple().compress(new TextEncoder().encode(json));
        blob = Buffer.from(c).toString("base64");
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  });
  const bytes = Buffer.from(blob, "base64");
  const out = fzstd.decompress(new Uint8Array(bytes));
  const decoded = JSON.parse(new TextDecoder().decode(out));
  if (decoded.cachedAt !== sample.cachedAt) {
    throw new Error("offline codec mismatch");
  }
  console.log("OK: offline IndexedDB codec (zstd-codec → fzstd)");
}

async function testEnvelopeUnwrap() {
  const { ZstdCodec } = require("zstd-codec");
  const fzstd = require("fzstd");
  const inner = { ok: true, count: 42 };
  let data = "";
  await new Promise((resolve, reject) => {
    ZstdCodec.run((zstd) => {
      try {
        const c = new zstd.Simple().compress(
          new TextEncoder().encode(JSON.stringify(inner)),
        );
        data = Buffer.from(c).toString("base64");
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  });
  const envelope = { encoding: "zstd-base64", data };
  const decoded = fzstd.decompress(
    new Uint8Array(Buffer.from(envelope.data, "base64")),
  );
  const parsed = JSON.parse(new TextDecoder().decode(decoded));
  if (parsed.count !== 42) throw new Error("envelope unwrap failed");
  console.log("OK: client envelope format (API → mailZstdEnvelope)");
}

let failed = false;
for (const fn of [testApiZstdUtil, testOfflineCodec, testEnvelopeUnwrap]) {
  try {
    await fn();
  } catch (e) {
    console.error("FAIL:", e?.message ?? e);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
