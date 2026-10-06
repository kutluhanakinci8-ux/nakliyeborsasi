# Ekolojik Market — VPS prod rollout (EK-PROD)

Kod `main`’de (#341) ancak prod endpoint yoksa `GET /public/ekolojik-market/status` **404** döner.

## Manuel deploy (sunucu)

```bash
cd /var/www/nakliyeborsasi
git fetch origin main && git checkout main && git pull origin main
DEPLOY_BRANCH=main bash scripts/deploy-production-vps.sh /var/www/nakliyeborsasi
```

## Doğrulama

```bash
# 404 kabul (henüz deploy yok)
bash scripts/verify-ekolojik-market-prod-rollout.sh

# Deploy sonrası zorunlu yeşil
EK_PROD_ROLLOUT_STRICT=1 bash scripts/verify-ekolojik-market-prod-rollout.sh
bash scripts/run-ekolojik-market-post-deploy-gate.sh
```

## GitHub Actions Deploy VPS

`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` secrets tanımlı değilse workflow deploy adımını **SKIP** eder (main kırmızı olmaz).
