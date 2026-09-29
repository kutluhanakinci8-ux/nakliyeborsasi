# Üç aylık güvenlik ve uyumluluk checklist

**Periyot:** Her çeyrek (Ocak, Nisan, Temmuz, Ekim) · **Kayıt:** Ticket + tarih damgası

## A. Bağımlılık ve CVE

```bash
cd /var/www/nakliyeborsasi
npm audit --audit-level=high
```

| Madde | Kabul |
|-------|--------|
| **critical** açık | 0 (veya yazılı istisna + ETA) |
| **high** açık | ≤ 5 veya `npm audit fix` planı |
| `package-lock.json` commit | Prod deploy ile uyumlu |

## B. Erişim ve sırlar

- [ ] `.env` / VPS sırları rotasyonu (JWT, VAPID, ESP, DB) — yılda ≥1 veya olay sonrası
- [ ] Platform operatör hesapları — aktif kullanıcı listesi
- [ ] `OPERATOR_JWT` smoke: `resolve-operator-jwt.sh` + `verify-communications-ops-snapshot.sh`

## C. Pen-test / zafiyet taraması

| Seviye | Frekans |
|--------|---------|
| Otomatik (npm audit, opsiyonel OWASP ZAP baseline) | Çeyreklik |
| Manuel pentest (dış firma veya bug bounty) | **Yıllık** veya büyük sürüm öncesi |

Kanıt: rapor PDF veya ticket linki — müşteri due diligence ZIP’e eklenir.

## D. DR ve mesajlaşma SLO

```bash
bash scripts/verify-dr-drill-evidence.sh
SKIP_PLAYWRIGHT=1 bash scripts/vps-operator-verify.sh
```

- [ ] DR JSON güncel (`rtoMinutes`, `restoredAt`)
- [ ] `smoke-messaging-sse-load.sh` (JWT varsa)

## E. KVKK doküman uyumu

- [ ] [SECURITY_DATA_PROCESSING_INVENTORY.md](./SECURITY_DATA_PROCESSING_INVENTORY.md) — alt işleyen listesi güncel
- [ ] WA köprü KVKK metni (`kvkkNoticeAccepted`) — `verify-messaging-wa-bridge-sandbox.sh`

**MP-9 otomasyon:** `bash scripts/verify-security-compliance-mp9.sh`
