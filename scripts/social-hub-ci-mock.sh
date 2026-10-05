#!/usr/bin/env bash
# CI: API build + mock webhook/template fixture self-test (prod secret gerekmez).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

echo "== Social hub CI: monorepo build =="
npm run build

echo "== Social hub CI: mock webhook fixtures =="
node -e "
const path = require('path');
const mod = require(path.join('${ROOT}', 'apps/api/dist/modules/social-hub/socialHubWebhookFixtureSelfTest.js'));
mod.runSocialHubWebhookFixtureSelfTest();
console.log('OK: mock webhook fixtures');
"

echo "social-hub-ci-mock: PASS"
