#!/usr/bin/env bash
# BB sonrası entegrasyon kapısı — public /status integrationGate doğrulaması.
set -euo pipefail
export SOCIAL_HUB_SMOKE_EXPECT_PHASE=bc
exec "$(dirname "$0")/smoke-social-hub.sh"
