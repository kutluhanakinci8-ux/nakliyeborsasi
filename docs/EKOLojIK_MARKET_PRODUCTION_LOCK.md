# Ekolojik Market — production lock (kalıcı)

**Durum:** Ekolojik «Posta & Mesaj» paritesi `main` + **app.lerta.com.tr** prod.

| Alan | Değer |
|------|--------|
| Program fazı (API) | `ek-u4` |
| Canonical merge | PR **#341** … **#346** → `main` |
| Hub | https://app.lerta.com.tr/marketim/posta-ve-mesaj |
| Status | `GET /api/v1/public/ekolojik-market/status` |

## Deploy (kalıcı)

```bash
# Cloud Agent / operatör
VPS_BRANCH=main bash scripts/deploy-vps-ssh.sh
```

Sunucuda: `DEPLOY_BRANCH=main bash scripts/deploy-production-vps.sh /var/www/nakliyeborsasi`

## Doğrulama (prod)

```bash
bash scripts/run-ekolojik-market-live-verify.sh
bash scripts/verify-ekolojik-market-program-done.sh
```

## CI

- `ekolojik-market-parity.yml` — program-done + build; prod smoke 404-safe (`EK_PROD_ROLLOUT_STRICT=0`)
- Deploy sonrası strict: `workflow_dispatch` → `prod_rollout_strict`
