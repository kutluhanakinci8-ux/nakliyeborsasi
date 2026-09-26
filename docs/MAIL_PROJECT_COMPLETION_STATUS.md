# Lerta Posta — proje tamamlanma durumu

**Amaç:** Kod/repo ile iş/ops maddelerini ayırarak yüzdelik ilerleme.  
**Son güncelleme:** 2026-09-26 (gap-close sprint).

---

## Özet (tüm ürün)

| Alan | Kod / repo | Canlı / iş kararı | Not |
|------|------------|-------------------|-----|
| **Faz B–F (kurumsal, webmail, güven, ops)** | **~98%** | VPS deploy ile senkron | Eksik: otomasyon testleri, CalDAV çakışma UI |
| **Faz G + D6 (UX + takvim)** | **~97%** | G0 HTTPS periyodik doğrulama | SW v4; iOS PWA push kısıtları |
| **Faz A (lansman gelir + www)** | **~85%** | **~40%** | Stripe/iyzico **canlı anahtar**, A4 www cutover |
| **Rakip UX skoru (benchmark)** | — | **~74/100** | AI, native app, tam RTE dışı |

**Genel (kod ağırlıklı): ~94%** · **Genel (lansman dahil uçtan uca): ~78%**

---

## Faz A — Lansman

| Madde | Kod | Ops / siz |
|-------|-----|-----------|
| A1 Stripe test checkout | 100% | VPS test anahtar + manuel checkout |
| A2 Stripe canlı + webhook | 100% | Live keys + DNS |
| A3 iyzico prod | 100% | Live keys |
| A4 www cutover | 100% script | DNS / U88 taşıma |
| A5 vitrin kimlik | 100% | Hukuk metin onayı |
| A6 onboarding | 100% | — |
| A7 fiyat TRY/EUR | 100% | — |

**Faz A kod: ~100%** · **Faz A canlı: ~40%**

Kontrol: `bash scripts/run-lansman-preflight.sh` (+ isteğe `OPERATOR_JWT` ile A1).

---

## Faz B–C — Kurumsal & pilot

| Blok | Tamamlanma |
|------|------------|
| B1–B7 | 100% |
| C1–C5 | 100% |

---

## Faz D — Webmail kutu

| Madde | % |
|-------|---|
| D1 thread | 100% |
| D2 arşiv/çöp | 100% |
| D3 imza/şablon | 100% |
| D4 arama | 100% |
| D5 depolama | 100% |
| D6 takvim/kişi + CalDAV/CardDAV/tekrar | 98% (çakışma UI, tam RFC edge) |
| D7 push/ses | 95% |

**Faz D kod: ~98%**

---

## Faz G — UX

| Madde | % |
|-------|---|
| G0 HTTPS | 95% (kod + script; VPS verify sürekli) |
| G1–G5+ | 100% |
| G6 offline + push | 95% |
| G7–G9 | 100% |
| Kurallar G6++ | 95% (karmaşık Sieve benzeri edge) |

**Faz G: ~97%**

---

## Faz E — Güven & KVKK

E1–E7: **100%** (runbook + konsol + API).

---

## Faz F — Operasyon

F1–F5: **100%**.

---

## Bilinçli olarak yapılmadı / dış kapsam

- Native iOS/Android mağaza uygulaması
- AI özet / akıllı yanıt
- Tam WYSIWYG editör (Gmail seviyesi)
- CalDAV iki yönlü çakışma çözüm ekranı
- Kapsamlı jest/vitest e2e paketi (manuel smoke + deploy checklist)

---

## Deploy

```bash
bash scripts/agent-deploy.sh
bash scripts/run-lerta-mail-vps-deploy-checklist.sh
```
