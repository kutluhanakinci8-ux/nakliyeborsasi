#!/usr/bin/env node
/** Zstandard roundtrip: zstd-codec (sıkıştır) + fzstd (aç). */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { ZstdCodec } = require("zstd-codec");
const fzstd = require("fzstd");

const sample = JSON.stringify({
  summary: { unreadCount: 2 },
  messages: [{ id: "m1", subject: "Lerta Posta Zstd test" }],
});

let failed = false;
ZstdCodec.run((zstd) => {
  const compressed = new zstd.Simple().compress(
    new TextEncoder().encode(sample),
  );
  const out = fzstd.decompress(compressed);
  const decoded = new TextDecoder().decode(out);
  if (decoded !== sample) {
    console.error("FAIL: roundtrip mismatch");
    failed = true;
    return;
  }
  const ratio = compressed.length / sample.length;
  console.log(
    `OK: zstd roundtrip (${sample.length} → ${compressed.length} bytes, ratio ${ratio.toFixed(2)})`,
  );
});

process.exit(failed ? 1 : 0);
