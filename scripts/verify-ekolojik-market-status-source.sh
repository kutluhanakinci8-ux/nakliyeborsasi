#!/usr/bin/env bash
# EK-OPS: repo kaynağı — public status sabitleri, scriptler ve hub yolları (canlı API gerekmez).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTROLLER="${ROOT}/apps/api/src/modules/ekolojik-market/EkolojikMarketStatusController.ts"
ROADMAP="${ROOT}/docs/EKOLojIK_MARKET_PARITY_ROADMAP.md"
WORKFLOW="${ROOT}/.github/workflows/ekolojik-market-parity.yml"

echo "== Ekolojik market status source verify =="

test -f "${CONTROLLER}" || {
  echo "FAIL: missing EkolojikMarketStatusController" >&2
  exit 1
}
test -f "${ROADMAP}" || {
  echo "FAIL: missing parity roadmap" >&2
  exit 1
}
test -f "${WORKFLOW}" || {
  echo "FAIL: missing ekolojik-market-parity workflow" >&2
  exit 1
}

for script in \
  smoke-ekolojik-market-parity.sh \
  run-ekolojik-market-parity-close-checklist.sh \
  verify-ekolojik-market-status-source.sh; do
  path="${ROOT}/scripts/${script}"
  test -f "${path}" || {
    echo "FAIL: missing scripts/${script}" >&2
    exit 1
  }
  test -x "${path}" || chmod +x "${path}"
  echo "OK: scripts/${script}"
done

test -f "${ROOT}/apps/web/src/components/ekolojik/EkolojikCommunicationsHubClient.tsx" || {
  echo "FAIL: missing EkolojikCommunicationsHubClient" >&2
  exit 1
}
echo "OK: hub client component"

test -f "${ROOT}/docs/EKOLojIK_MARKET_VPS_ROLLOUT.md" || {
  echo "FAIL: missing EKOLojIK_MARKET_VPS_ROLLOUT.md" >&2
  exit 1
}
grep -q "prodRolloutVerifyScript" "${CONTROLLER}" || {
  echo "FAIL: prodRolloutVerifyScript missing" >&2
  exit 1
}
grep -q 'prodRolloutStrictEnvVar: "EK_PROD_ROLLOUT_STRICT"' "${CONTROLLER}" || {
  echo "FAIL: prodRolloutStrictEnvVar missing" >&2
  exit 1
}
grep -q "verify-ekolojik-market-prod-rollout.sh" "${ROOT}/.github/workflows/ekolojik-market-parity.yml" || {
  echo "FAIL: workflow smoke-public must use prod rollout verify" >&2
  exit 1
}
grep -q 'mergedCanonicalPullRequest: 341' "${CONTROLLER}" || {
  echo "FAIL: mergedCanonicalPullRequest 341 not in controller" >&2
  exit 1
}
grep -q 'canonicalMergeBranch: "main"' "${CONTROLLER}" || {
  echo "FAIL: canonicalMergeBranch main not in controller" >&2
  exit 1
}
grep -q 'EK_PHASE = "ek-u4"' "${CONTROLLER}" || {
  echo "FAIL: EK_PHASE not ek-u4 in controller" >&2
  exit 1
}
grep -q 'EK_POSTA_PHASE_COMPLETE = "ek-p11"' "${CONTROLLER}" || {
  echo "FAIL: EK_POSTA_PHASE_COMPLETE not ek-p11" >&2
  exit 1
}
echo "OK: controller phase constants (ek-u4 / posta ek-p11)"

export EKOLOJIK_CONTROLLER="${CONTROLLER}"
python3 <<'PY'
import os
import re
import sys

path = os.environ["EKOLOJIK_CONTROLLER"]
text = open(path, encoding="utf-8").read()

phase = re.search(r'const EK_PHASE = "([^"]+)"', text)
posta = re.search(r'const EK_POSTA_PHASE_COMPLETE = "([^"]+)"', text)
if not phase or phase.group(1) != "ek-u4":
    sys.exit("FAIL: EK_PHASE parse")
if not posta or posta.group(1) != "ek-p11":
    sys.exit("FAIL: EK_POSTA_PHASE_COMPLETE parse")

m = re.search(r"const EK_FEATURES = \[(.*?)\] as const;", text, re.S)
if not m:
    sys.exit("FAIL: EK_FEATURES block not found")
features = re.findall(r'"([^"]+)"', m.group(1))
required = {
    "ekolojik_parity_close_checklist",
    "ekolojik_ci_workflow_ek_0",
    "ekolojik_mail_ops_snapshot_runbook_hub",
}
missing = required - set(features)
if missing:
    sys.exit(f"FAIL: EK_FEATURES missing {sorted(missing)}")
if "ek-u4" not in text:
    sys.exit("FAIL: ek-u4 milestone missing in controller")

if 'statusSourceVerifyScript' not in text:
    sys.exit("FAIL: ekolojikCi.statusSourceVerifyScript not declared")
if "verify-ekolojik-market-status-source.sh" not in text:
    sys.exit("FAIL: verify script path not in controller")
if 'fullGateEnvVar: "EK_U4_FULL"' not in text:
    sys.exit("FAIL: parityClose.fullGateEnvVar EK_U4_FULL missing")
if "rollManifestVerifyScript" not in text:
    sys.exit("FAIL: ekolojikCi.rollManifestVerifyScript not declared")
if "verify-ekolojik-market-roll-manifest.sh" not in text:
    sys.exit("FAIL: roll manifest script path not in controller")
if "postDeployGateScript" not in text:
    sys.exit("FAIL: parityClose.postDeployGateScript not declared")
if "run-ekolojik-market-post-deploy-gate.sh" not in text:
    sys.exit("FAIL: post-deploy gate script path not in controller")
if "phasePrCleanupVerifyScript" not in text:
    sys.exit("FAIL: ekolojikCi.phasePrCleanupVerifyScript not declared")
if "EKOLojIK_MARKET_PHASE_PR_CLEANUP.md" not in text:
    sys.exit("FAIL: phasePrCleanupDoc path not in controller")
if "phasePrCloseScript" not in text:
    sys.exit("FAIL: ekolojikCi.phasePrCloseScript not declared")
if 'phasePrCloseEnvVar: "EK_CLOSE_STALE_PRS"' not in text:
    sys.exit("FAIL: phasePrCloseEnvVar EK_CLOSE_STALE_PRS missing")
if "programDone:" not in text:
    sys.exit("FAIL: parityClose.programDone block missing")
if "ekolojik_program_done_gate" not in text:
    sys.exit("FAIL: ekolojik_program_done_gate feature missing")

print(f"OK: EK_FEATURES count={len(features)}")
PY

grep -q "verify-ekolojik-market-status-source.sh" "${WORKFLOW}" || {
  echo "FAIL: workflow does not reference status source verify" >&2
  exit 1
}
echo "OK: CI workflow includes source verify"

grep -q "ek-u4" "${ROADMAP}" || {
  echo "FAIL: roadmap missing ek-u4" >&2
  exit 1
}
grep -q "verify-ekolojik-market-status-source.sh" "${ROADMAP}" || {
  echo "FAIL: roadmap missing verify-ekolojik-market-status-source.sh" >&2
  exit 1
}
echo "OK: roadmap EK-OPS refs"

echo "verify-ekolojik-market-status-source: PASS"
