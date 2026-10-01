# Sosyal medya & kanallar — kod %100 yol haritası (faz listesi)

**Başlangıç (prod):** `phase: an` · 7 sekme · 4 prod kanal + 2 beta (TikTok/YouTube)  
**Hedef:** Entegrasyon / canlı test öncesi **kod tarafında** “Lerta hedefi” rubriğinin **%100** kapanması (nakliye SMB: Mesajlar + kanal + yayın + ops).  
**Kapsam dışı (v1 kod tamamlanma):** Meta Ads yönetimi, kurumsal sosyal dinleme, Sprout seviyesi rakip analitiği — ayrı ürün çizgisi.

**Çalışma kuralı:** Her faz = `cursor/social-hub-phase-<kod>-5925` → PR → merge → (entegrasyon öncesi) birim/CI testleri; **canlı müşteri trafiği son aşamada**.

---

## “Kod %100” tanımı (Definition of Done)

| # | Kriter | Doğrulama |
|---|--------|-----------|
| 1 | 7 sekmedeki “yapılmadı / sonraki faz” metinleri kaldırıldı veya feature-flag ile doğru | UI + i18n |
| 2 | Kanal matrisi: planlanan 6 kanal için kod yolu tam (IG, Messenger, WA, LinkedIn, TikTok, YouTube) | provider + capabilities |
| 3 | Her sekme için API + web + tipler + normalize + smoke maddesi | `smoke-social-hub.sh` |
| 4 | Mock/sandbox veya contract test (OAuth/webhook olmadan CI) | `apps/api` test / smoke |
| 5 | `features[]` ile uyumlu; `social-hub-phase-*.sql` bundle güncel | apply script |
| 6 | Rubrik maddelerinin tamamı “implemented” veya “explicitly deferred v2” (dokümante) | bu dosya §Checklist |

---

## Ana checklist (Lerta hedefi → %100)

Ağırlıklar toplam **100**. Mevcut tahmini puan **72**. Kapanacak **28 puan** fazlara dağıtıldı.

| ID | Alan | Ağırlık | Şimdi | Hedef | Faz |
|----|------|---------|-------|-------|-----|
| C1 | Bağlı hesaplar — 6 kanal kod yolu | 8 | 6 | 8 | AV, AW |
| C2 | OAuth + token refresh tüm prod kanallar | 5 | 4 | 5 | AV, AW |
| C3 | Webhook köprü + denetim (kod) | 4 | 4 | 4 | — (tamam) |
| I1 | Gelen kutusu — sekme içi özet / son konuşmalar | 6 | 2 | 6 | AQ |
| I2 | Mesajlar deep link + sosyal filtre senkron | 3 | 3 | 3 | — |
| I3 | Platform sync-inbox (prod + roadmap özet) | 4 | 3 | 4 | AR |
| P1 | Yayın — medya (görsel/video URL veya upload) | 6 | 1 | 6 | AS |
| P2 | Yayın — Graph/LinkedIn gerçek publish UI geri bildirimi | 4 | 3 | 4 | AS |
| P3 | Zamanlama + takvim grid | 4 | 2 | 4 | AT |
| P4 | Onay akışı uçtan uca | 3 | 3 | 3 | — |
| T1 | Şablon — değişkenler / kanal kapsamı | 3 | 1 | 3 | AU |
| A1 | İstatistikler — Meta Graph (takipçi, medya sayısı, 28g trend) | 8 | 0 | 8 | AO |
| A2 | İstatistikler — LinkedIn sayfa istatistikleri | 4 | 0 | 4 | AP |
| A3 | İstatistikler — operasyon (webhook, giden) birleşik dashboard | 3 | 3 | 3 | — |
| O1 | Sağlık, Slack, CSV, admin ops | 8 | 8 | 8 | — |
| O2 | E2E mock provider + CI workflow | 5 | 2 | 5 | BE |
| E1 | Ekip, KVKK, denetim CSV | 4 | 4 | 4 | — |
| L1 | LinkedIn DM (inbox) veya resmi “v2” kapısı | 4 | 0 | 4 | AX |
| X1 | İsteğe bağlı: X / Google Business provider iskeleti | 3 | 0 | 3 | AY (opsiyonel) |
| M1 | Mobil/PWA sosyal hub kısayolları | 2 | 0 | 2 | BB |

**Not:** C1–C2 tamamlandığında kanal “prod parity” kodu biter; canlı Meta App Review ayrı entegrasyon adımıdır.

---

## Faz listesi (sıra zorunlu)

| Faz | Kod | Odak | Kapanan checklist | Kümülatif Lerta % (tahmini) |
|-----|-----|------|-------------------|-----------------------------|
| 1 | **AO** | İstatistikler: firma OAuth ile Meta Graph insights (bağlı IG/FB) | A1 | **80** |
| 2 | **AP** | İstatistikler: LinkedIn org metrics + analitik CSV genişletme | A2 | **84** |
| 3 | **AQ** | Gelen kutusu: sekme içi “son sosyal konuşmalar” (Mesajlar API) | I1 | **88** |
| 4 | **AR** | Gelen kutusu: tüm kanallar sync-inbox + unread/open özet | I3 | **91** |
| 5 | **AS** | Yayınlar: medya alanları, upload/storage, publish sonuç UI | P1, P2 | **94** |
| 6 | **AT** | Yayınlar: takvim grid, toplu iptal/yeniden dene | P3 | **96** |
| 7 | **AU** | Şablonlar: `{{degisken}}`, kanal scope, önizleme | T1 | **97** |
| 8 | **AV** | TikTok: prod provider (OAuth, webhook, outbound varsayılan kod yolu) | C1 (kısmi) | **98** |
| 9 | **AW** | YouTube: prod provider (Pub/Sub, routing, outbound) | C1, C2 | **99** |
| 10 | **AX** | LinkedIn: DM inbox köprüsü **veya** capability + UI “v2” (rubrik L1 kapanır) | L1 | **100** |
| 11 | **AY** | *(Opsiyonel)* X + Google Business `pending` provider + UI kartı | X1 | 100+ |
| 12 | **AZ** | Kod tamamlama: eski UI metinleri, feature flag audit, `phase: az` | DoD #1 | 100 |
| 13 | **BA** | Mock Graph/webhook + `social-hub` CI job (entegrasyon öncesi test) | O2 | 100 |
| 14 | **BB** | PWA: `/hesap/sosyal-medya` manifest + bildirim hook iskeleti | M1 | 100 |

**Entegrasyon / canlı test (faz dışı kapı):** Meta App Review, prod webhook URL, gerçek WABA, müşteri pilotu — **BB sonrası** tek “Integration Gate” checklist.

---

## Faz detayları (uygulama notları)

### AO — Meta insights (İstatistikler sekmesi)
- **API:** `GET /company/social-hub/analytics/platform-insights` (IG/FB bağlı hesaplar).
- **Kaynak:** Firma token vault + Graph (`insights` / sayfa metrikleri); admin `InstagramPublicStatsService` mantığı firma bağlamına taşınır.
- **Web:** Kartlar: takipçi, erişim (varsa), medya/gönderi sayısı, 28g sparkline (basit tablo yeterli v1).
- **SQL:** `social-hub-phase-ao.sql` (gerekirse insights cache tablosu).
- **Smoke:** `SOCIAL_HUB_SMOKE_ANALYTICS_INSIGHTS=1` (JWT ile alan varlığı).

### AP — LinkedIn insights
- **API:** LinkedIn marketing API org stats (bağlı hesap).
- **Web:** İstatistikler sekmesine LinkedIn kartı; `analytics/export` CSV’ye kolonlar.

### AQ — Inbox özet paneli
- **API:** `GET /company/social-hub/inbox/threads-preview` (Mesajlar thread listesi, `filter=social`, limit 10).
- **Web:** Gelen kutusu sekmesinde liste + “Mesajlar’da aç” (mevcut deep link).

### AR — Sync genişletme
- **API:** Prod kanallar için sync-inbox tutarlılığı; roadmap `summarize` + hata yüzeyi.
- **Web:** Kanal bazlı “son sync” + open count ile webhook bridged hizası.

### AS — Yayın medya
- **API:** `mediaUrls` upload endpoint veya mevcut dosya servisi; publish pipeline medya desteği.
- **Web:** Yayınlar compose’ta dosya seçici; publish hata/başarı toast.
- **UI:** “sonraki fazda” metnini kaldır.

### AT — Takvim grid
- **Web:** Ay/hafta grid (mevcut listeyi tamamlar); scheduled posts API’den.
- **API:** Gerekirse `GET /posts?from=&to=` filtre.

### AU — Şablonlar
- **API:** Template render `{{companyName}}` vb.; channelScope zorunluluğu.
- **Web:** Önizleme + Mesajlar’da kullan kopyala.

### AV / AW — TikTok & YouTube prod kod yolu
- **API:** `implementationStatus: ready` when env configured; default capabilities from `getRoadmapProviderCapabilities` env-independent **code paths** (feature flag sadece deploy).
- **Test:** Webhook signature/push auth contract tests (mevcut smoke genişletilir).
- **Web:** Beta rozeti → “Bağlı” durumları roadmap kartında.

### AX — LinkedIn DM
- **Seçenek A (tercih):** LinkedIn Messaging API köprüsü (webhook polling veya partner API).
- **Seçenek B:** `inboxWebhook: false` kalır; UI’da net “Yayın only — DM v2” + rubrik L1 “deferred” kapanır checklist’te **implemented: explicit v2 gate**.

### AZ — Kod freeze polish
- Tüm sekmelerde copy audit; `SocialHubModuleStatusController.phase: az`.
- `features[]` sadeleştirme (duplicate bayraklar birleşik).

### BA — CI / mock
- `SocialHubMockProvider` veya webhook fixture POST testleri.
- GitHub workflow: `social-hub-ci.yml` (build + smoke without prod secrets).

### BB — PWA (hafif)
- Manifest scope; opsiyonel web push “sosyal hub sağlık critical” hook.

---

## Entegrasyon kapısı (kod %100 sonrası)

| Adım | Açıklama |
|------|----------|
| E1 | Meta: verify token, app review, prod webhook URL |
| E2 | WhatsApp: WABA + template onayları |
| E3 | LinkedIn: marketing API product erişimi |
| E4 | TikTok/YouTube: partner anahtarları prod `.env` |
| E5 | Pilot firma: `webhookBridge24h > 0` smoke |
| E6 | UAT: 7 sekme manuel + CSV indirmeleri |

---

## Özet akış

```text
[an] ──► AO ──► AP ──► AQ ──► AR ──► AS ──► AT ──► AU ──► AV ──► AW ──► AX ──► AZ ──► BA ──► BB
         │         │         │         │         │         │         │         │         │
         └─ analitik ────────┴─ inbox ─┴─ publish ───────┴─ channels ─┴─ polish ─┴─ CI ─┘
                                                                                    │
                                                                         Integration Gate
```

**Sıradaki uygulama fazı:** **AO** (Meta insights → İstatistikler %32 → ~%80 sekme puanı).

---

## Referans

- Mevcut durum özeti: kullanıcı karşılaştırma tablosu (faz `an`, 137 feature bayrak).
- SQL bundle: `scripts/apply-social-hub-prod-schema.sh`
- Smoke: `scripts/smoke-social-hub.sh`
