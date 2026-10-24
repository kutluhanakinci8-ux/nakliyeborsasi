#!/usr/bin/env bash
# Yük (load) + hafif stres: public uçlara eşzamanlı istek (üretim dostu düşük hacim).
set -euo pipefail

TARGET="${QA_LOAD_TARGET:-https://posta.lerta.com.tr/login}"
CONCURRENCY="${QA_LOAD_CONCURRENCY:-20}"
REQUESTS="${QA_LOAD_REQUESTS:-200}"
TIMEOUT="${QA_LOAD_TIMEOUT_SEC:-15}"

echo "== QA Load/Stress (light) =="
echo "target=${TARGET} concurrency=${CONCURRENCY} requests=${REQUESTS}"

if ! command -v node >/dev/null 2>&1; then
  echo "SKIP: node yok"
  exit 0
fi

node <<'NODE'
const http = require("http");
const https = require("https");
const { URL } = require("url");

const target = process.env.QA_LOAD_TARGET || "https://posta.lerta.com.tr/login";
const concurrency = Number(process.env.QA_LOAD_CONCURRENCY || 20);
const total = Number(process.env.QA_LOAD_REQUESTS || 200);
const timeoutMs = Number(process.env.QA_LOAD_TIMEOUT_SEC || 15) * 1000;

const url = new URL(target);
const lib = url.protocol === "https:" ? https : http;

let completed = 0;
let errors = 0;
let latencies = [];
let inFlight = 0;
let idx = 0;

function oneRequest() {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: url.pathname + url.search,
        method: "GET",
        timeout: timeoutMs,
      },
      (res) => {
        res.resume();
        res.on("end", () => {
          latencies.push(Date.now() - start);
          if (res.statusCode >= 500) errors += 1;
          resolve();
        });
      },
    );
    req.on("error", () => {
      errors += 1;
      latencies.push(Date.now() - start);
      resolve();
    });
    req.on("timeout", () => {
      req.destroy();
      errors += 1;
      latencies.push(Date.now() - start);
      resolve();
    });
    req.end();
  });
}

async function worker() {
  while (idx < total) {
    idx += 1;
    inFlight += 1;
    await oneRequest();
    inFlight -= 1;
    completed += 1;
  }
}

(async () => {
  const workers = Array.from({ length: concurrency }, () => worker());
  const wallStart = Date.now();
  await Promise.all(workers);
  const wallMs = Date.now() - wallStart;
  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] ?? 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] ?? 0;
  const rps = (completed / (wallMs / 1000)).toFixed(1);
  console.log(`completed=${completed} errors=${errors} wallMs=${wallMs} rps=${rps} p50ms=${p50} p95ms=${p95}`);
  const failRate = errors / Math.max(1, completed);
  if (failRate > 0.05) {
    console.error(`FAIL: error rate ${(failRate * 100).toFixed(1)}% > 5%`);
    process.exit(1);
  }
  if (p95 > 8000) {
    console.error(`WARN: p95 ${p95}ms > 8000ms`);
    process.exit(1);
  }
  console.log("qa-load-stress: PASS");
})();
NODE
