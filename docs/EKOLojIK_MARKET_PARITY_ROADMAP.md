# Ekolojik Market — NB/Lerta iletişim paritesi (faz planı)

**Hedef:** Marketim «Ekolojik Posta & Mesaj» + sosyal kanallar = Nakliye Borsası `mail-web` + Mesajlar (FS-1…12) + Social Hub (AO…BL) ile **aynı kod yolları**, **ayrı tenant/veri** (NB ile paylaşılmaz).

**Çalışma kuralı:** `cursor/ekolojik-market-<kod>-5925` → PR → merge → `scripts/smoke-ekolojik-market-parity.sh` + ilgili `verify-*`.

---

## Faz özeti (sıra zorunlu)

| Faz | Kod | Odak | NB referans |
|-----|-----|------|-------------|
| **EK-0** | `ek-0` | Ürün kabuğu, env, public status, smoke | — |
| **EK-U1** | `ek-u1` | Birleşik hub: Posta \| Mesajlar \| Sosyal | `/messaging` + `mail-web` + `/hesap/sosyal-medya` |
| **EK-P1…P11** | `ek-p*` | Posta tam parite | PM-1…PM-10, `apps/mail-web` |
| **EK-M1…M11** | `ek-m*` | Mesajlaşma tam parite | FS-1…12, P0–P4 |
| **EK-S1…S10** | `ek-s*` | Sosyal hub tam parite | AO…BC, BD…BL |
| **EK-U4** | `ek-u4` | Parite kapanış checklist (●) | `run-ekolojik-market-parity-close-checklist.sh` |

Detay: kullanıcı onayı sonrası `docs/LERTA_MAIL_MESSAGING_PARITY_100_ROADMAP.md`, `MESSAGING_PHASE_ROADMAP.md`, `SOCIAL_HUB_CODE_COMPLETE_ROADMAP.md`.

---

## EK-0 — Altyapı (● başlandı)

- `NEXT_PUBLIC_PRODUCT_SHELL=ekolojik` | `lerta`
- Route: `/marketim/posta-ve-mesaj`
- `GET /api/v1/public/ekolojik-market/status` → `phase`, `features[]`
- `scripts/smoke-ekolojik-market-parity.sh`

## EK-U1 — Birleşik iletişim merkezi (● başlandı)

- Tam `MessagingMailWebEmbed` (posta)
- Tam `MessagingThreadSidebar` + `MessagingConversationPanel` (mesajlar)
- `SocialHubPageClient` gömülü (sosyal)
- Marketim chrome (`EkolojikMarketShell`)

---

## Kabul (EK-U1)

- Oturum açık kullanıcı `/marketim/posta-ve-mesaj` → üç sekme çalışır
- Smoke: phase `ek-u1`, feature `ekolojik_communications_hub_unified`

---

## EK-P — Posta (`apps/mail-web`)

| Faz | Kod | İçerik |
|-----|-----|--------|
| P1 | ek-p1 | Hub içi tam embed + SSO (● EK-U1) |
| P2 | ek-p2 | Zengin compose, şablonlar, multipart (● `composeRich` + `composeTemplate` + `composeMultipart`) |
| P3 | ek-p3 | Hesaplar / alias / DNS hub (● `mailSettings=accounts|deliverability`) |
| P4 | ek-p4 | IMAP klasörleri: Fatura, Gönderilen, Arşiv sidebar eşlemesi (● deep link) |
| P5 | ek-p5 | Kurallar, swipe, bulk (● `mailSettings=rules` + `mailBulk` + `mailSwipe`) |
| P6 | ek-p6 | CalDAV / CardDAV (● `mailView=calendar|contacts` + `mailSettings=calendarSettings|contactsSettings`) |
| P7 | ek-p7 | Deliverability + DMARC panel (● `mailSettings=deliverability` + `mailDmarc=1`) |
| P8 | ek-p8 | PWA offline + push (● `mailSettings=notifications` + `mailPwa=1`) |
| P9 | ek-p9 | AI compose (opsiyonel) (● `compose=1` + `composeRich=1` + `composeAi=1`) |
| P10 | ek-p10 | Engagement / webhook analitik (● `mailSettings=deliverability` + `mailEngagement=1`) |
| P11 | ek-p11 | Ops snapshot + runbook (● `mailSettings=ops` + `mailOps=1`) |

## EK-M — Mesajlar

| Faz | Kod | İçerik |
|-----|-----|--------|
| M1 | ek-m1 | Hub chat UI (● EK-U1) |
| M2 | ek-m2 | SSE + Redis fan-out (● `useMessagingChatController` + canlı rozet) |
| M3 | ek-m3 | Düzenle/sil, mention, okundu, typing, şablon (● `MessagingChatModalsLayer` hub) |
| M4 | ek-m4 | 10 MB × 5 ek, audit, legal hold (● thread `legalHoldAt` + uyumluluk şeridi) |
| M5 | ek-m5 | Sosyal DM köprüsü (● `bolum=sosyal-dm` + Social Hub deep link) |
| M6 | ek-m6 | WA bridge FS-12 (● hub kart + `waBridge=1` + kanal paneli) |
| M7 | ek-m7 | Public API, Slack, Zapier (● `bolum=entegrasyon` hub) |
| M8 | ek-m8 | Grup thread + roller (● `grup-sohbet` + rol seçici) |
| M9 | ek-m9 | Push + çeviri + bildirim matrisi (● `bolum=bildirimler`) |
| M10 | ek-m10 | KVKK export / retention (● `bolum=kvkk` panel) |
| M11 | ek-m11 | Premium UI parity (● `MessagingSideRail` + zemin seçici) |

## EK-S — Sosyal hub

| Faz | Kod | İçerik |
|-----|-----|--------|
| S1 | ek-s1 | Hub embed (● EK-U1) |
| S2 | ek-s2 | Bağlantılar + OAuth (● `tab=connections` + OAuth `webReturnQuery`) |
| S3 | ek-s3 | Inbox özet + sync (● `tab=inbox` + sync özet paneli) |
| S4 | ek-s4 | Yayınlar + UTM + medya (● `tab=publishing` + `utm_*` deep link) |
| S5 | ek-s5 | Şablonlar (● `tab=templates` + `templateId` deep link) |
| S6 | ek-s6 | Analitik (● `tab=analytics` + CSV export + `utm_campaign` vurgu) |
| S7 | ek-s7 | Telegram BD–BL (● `platform=TELEGRAM` + bot/kanal sihirbazı) |
| S8 | ek-s8 | Ops + integration gate (● `tab=health` + `integration_gate=1`) |
| S9 | ek-s9 | TikTok/YouTube/PWA (● `platform=TIKTOK|YOUTUBE` + `tab=health&pwa=1`) |
| S10 | ek-s10 | Telegram Ads API (● `tab=publishing&telegram_ads=1` explicit v2 gate + UTM) |

## EK-U4 — Kapanış (●)

- `scripts/run-ekolojik-market-parity-close-checklist.sh` (public smoke + rubrik)
- Opsiyonel VPS tam kapı: `EK_U4_FULL=1` → `run-mail-messaging-parity-close-checklist.sh` (paylaşılan posta/mesaj altyapısı)
- Rubrik (`GET /public/ekolojik-market/status` → `parityClose`): posta **96%** / mesaj **96%** (eşik ≥95%), sosyal **BC** entegrasyon kapısı checklist
