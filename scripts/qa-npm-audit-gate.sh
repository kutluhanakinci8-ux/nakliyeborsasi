#!/usr/bin/env bash
# Runtime prod bağımlılıkları: critical=0 (tar override) + Next CVE takibi.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

crit="$(npm audit --omit=dev --audit-level=critical --json 2>/dev/null | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
  try{const j=JSON.parse(d);console.log(j.metadata?.vulnerabilities?.critical||0)}catch{console.log(99)}
})")"

echo "critical vulnerabilities (runtime): ${crit}"

if [[ "${crit}" -eq 0 ]]; then
  echo "qa-npm-audit-gate: PASS"
  exit 0
fi

if [[ "${crit}" -le 2 ]] && [[ "${NPM_AUDIT_ALLOW_NEXT_CRITICAL:-0}" == "1" ]]; then
  echo "qa-npm-audit-gate: PASS (NPM_AUDIT_ALLOW_NEXT_CRITICAL=1 — Next 16 + tar zinciri planlı yükseltme)"
  exit 0
fi

npm audit --omit=dev --audit-level=critical 2>&1 | tail -25
echo "qa-npm-audit-gate: FAIL" >&2
exit 1
