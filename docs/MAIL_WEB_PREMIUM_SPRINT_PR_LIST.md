# Lerta Posta (`mail-web`) — Premium sprint PR listesi

**Tarih:** 2026-10-25 (Europe/Istanbul)  
**Kapsam:** Sadece `apps/mail-web` (+ gerekli kök script’ler)  
**Base branch:** `main`  
**Branch adı şablonu:** `cursor/mail-web-<kısa-ad>-8521`

Bu liste, ön yüz denetimindeki P0→P2 maddelerinin **tek PR = tek odak** parçalanmış halidir. Her PR için kabul kriteri ve tahmini dokunuş alanı verilmiştir.

---

## Özet tablo

| PR | Öncelik | Başlık | Efor (teknik) |
|----|---------|--------|----------------|
| MW-01 | P0 | Next 15 `viewport` / `themeColor` + Lighthouse uyarısı | Küçük |
| MW-02 | P0 | `/mail` bundle — lazy load (kampanya, takvim, ağır paneller) | Orta |
| MW-03 | P0 | i18n altyapısı — `MailClientShell` + sidebar + empty states | Büyük |
| MW-04 | P0 | i18n — compose + okuma/yanıt + hata mesajları | Büyük |
| MW-05 | P0 | Google Takvim OAuth UI + ayarlar girişi (env yoksa graceful) | Orta |
| MW-06 | P0 | Pilot faturalama — konsol linkleri + posta içi bilgi bandı | Küçük |
| MW-07 | P1 | Design tokens — CSS değişkenleri + login/mail hizalama | Orta |
| MW-08 | P1 | Vitrin tutarlılık — footer CTA, marka, `verify` script hook | Küçük |
| MW-09 | P1 | iOS PWA onboarding — Ayarlar + ilk giriş banner | Orta |
| MW-10 | P1 | Bağlı hesaplar (CAP) — filtre/rozet/empty state cilası | Orta |
| MW-11 | P1 | Kampanya UI — istatistik kartları + boş durum (read-only iyileştirme) | Orta |
| MW-12 | P2 | Klavye — `j`/`k` + Shift aralık seçimi (regresyon test) | Küçük |
| MW-13 | P2 | Yanıt alıntısı — WYSIWYG önizleme parity | Orta |
| MW-14 | P2 | Playwright — compose açılış + ayarlar smoke (oturum mock) | Orta |
| MW-15 | P2 | Capacitor / native shell — mail-web derin link + status bar | Büyük (ayrı faz) |

---

## P0 — Müşteri sunumu

### MW-01 — Metadata & Lighthouse uyarıları

**Branch:** `cursor/mail-web-viewport-lighthouse-8521`

**Yapılacaklar:**
- `apps/mail-web/src/app/layout.tsx`: `themeColor` → `viewport` export (Next 15).
- Gerekirse `mail/layout.tsx` alt route’ları tarayıp aynı düzeltme.
- `scripts/verify-lighthouse-mail-pwa.sh` veya wave-2’de gerçek skor notu dokümante.

**Kabul:**
- `next build` uyarısız (themeColor metadata).
- Playwright messaging-hub benzeri uyarı mail-web build log’unda yok.
- Prod Lighthouse PWA ≥ 80 bir koşuda kayıt altına alınabilir (ops notu PR body).

**Dosyalar:** `layout.tsx`, `globals.css` (gerekmezse dokunma).

---

### MW-02 — İlk yükleme performansı (code splitting)

**Branch:** `cursor/mail-web-lazy-panels-8521`

**Yapılacaklar:**
- `MailClientShell.tsx` veya `page.tsx`: `dynamic(() => import(...), { ssr: false })` ile:
  - `MailCampaignHistoryPanel` / blok editör
  - `MailCalendarPanel`
  - `MailContactsPanel`
  - Opsiyonel: `MailSettingsPanel` (ilk paint sonrası).
- Loading skeleton veya mevcut spinner ile boş flash önleme.

**Kabul:**
- `npm run build -w @lerta/mail-web` — `/mail` First Load JS **ölçülebilir düşüş** (PR’da before/after tablo).
- Manuel: Gelen kutusu açılışı çalışır; kampanya/takvim ilk tıklamada yüklenir.

**Dosyalar:** `MailClientShell.tsx`, `app/mail/page.tsx`, gerekirse küçük `MailPanelSkeleton.tsx`.

---

### MW-03 — i18n: kabuk ve navigasyon

**Branch:** `cursor/mail-web-i18n-shell-8521`

**Yapılacaklar:**
- `mailLocale.ts`: sidebar, view isimleri (Gelen, Gönderilen, Spam…), `MailEmptyState` variant metinleri.
- `MailClientShell.tsx`: `t()` ile nav ve başlıklar.
- `document.documentElement.lang` `MailLocaleProvider` ile senkron (zaten kısmen var).

**Kabul:**
- EN seçili: sidebar + ana başlıklar İngilizce.
- `e2e/login-locale.spec.ts` genişletme: `/mail` mock token veya public login sonrası bir label (opsiyonel cookie fixture).

**Dosyalar:** `mailLocale.ts`, `MailLocaleProvider.tsx`, `MailClientShell.tsx`, `MailEmptyState.tsx`.

---

### MW-04 — i18n: compose, okuma, API hataları

**Branch:** `cursor/mail-web-i18n-compose-read-8521`

**Yapılacaklar:**
- `ComposeRichEditor`, `MailReplyQuotePreview`, toast/alert string’leri locale’e taşı.
- `mailApi.ts` kullanıcıya dönen sabit TR string’ler → caller’da `t()` veya error code map.

**Kabul:**
- EN: “Send”, “Reply”, “Forward”, spam hint EN (mevcut key).
- TR regressions: mevcut Playwright login testleri PASS.

**Dosyalar:** `MailClientShell.tsx` (compose bölümü), `ComposeRichEditor.tsx`, `useMailClientController.ts` (user-facing errors).

---

### MW-05 — Google Takvim OAuth (UI + graceful degrade)

**Branch:** `cursor/mail-web-google-calendar-oauth-ui-8521`

**Yapılacaklar:**
- `MailCalendarPanel` / ayarlar: “Google Takvim bağla” → `/mail/google-calendar-oauth` (mevcut route).
- API `integration-status` veya env probe: anahtar yoksa **kurulum rehberi** kartı (link `docs/MAIL_GOOGLE_CALENDAR.md` vitrin veya help).
- Microsoft takvim ile görsel parity (aynı kart düzeni).

**Kabul:**
- VPS’te env doluysa OAuth akışı tamamlanır.
- Env boşsa kullanıcıya net “yönetici yapılandırması gerekli” (500 yerine).

**Dosyalar:** `MailCalendarPanel.tsx`, `MailSettingsPanel.tsx` hub, `app/mail/google-calendar-oauth/page.tsx`.

---

### MW-06 — Pilot mod bilgilendirme (posta tarafı)

**Branch:** `cursor/mail-web-pilot-billing-banner-8521`

**Yapılacaklar:**
- `GET company/mail-inbox/integration-status` veya mevcut billing flag ile:
  - Ayarlar → Faturalama veya hub’da **pilot ücretsiz** bilgi bandı.
  - Link: `yonetim.lerta.com.tr` plan sayfası (`postaOnboardingUrls`).

**Kabul:**
- `MAIL_BILLING_PILOT_FREE=1` ortamında kullanıcı “ödeme kapalı pilot” mesajı görür.
- Canlı Stripe açıldığında band koşullu gizlenir.

**Dosyalar:** `MailSettingsPanel.tsx`, `MailPostaSettings.tsx` veya `MailIntegrationsSettingsPanel.tsx`, `mailApi.ts` (status type).

---

## P1 — Premium algı ve ekosistem

### MW-07 — Design tokens (mail-web içi)

**Branch:** `cursor/mail-web-design-tokens-8521`

**Yapılacaklar:**
- `globals.css`: `--mail-*` token seti (renk, radius, shadow yok kuralına uygun flat).
- Login + mail shell aynı `--mail-brand`, `--mail-surface` kullanır.
- Koyu tema token’ları `data-mail-theme` ile.

**Kabul:**
- Görsel regresyon: ekran görüntüsü checklist (login, inbox, compose).
- Hardcoded hex azaltma (grep audit PR description).

---

### MW-08 — Vitrin tutarlılık

**Branch:** `cursor/mail-web-vitrin-parity-8521`

**Yapılacaklar:**
- Login footer / header link metinleri vitrin ile hizalı (`vitrinPath`).
- Ops: `scripts/verify-vitrin-posta-consistency.sh` (varsa) mail-web string sabitleri ile uyum notu.

**Kabul:**
- `verify-vitrin-posta` veya manuel: www/posta’da aynı marka adı “Lerta Posta”.

---

### MW-09 — iOS PWA onboarding

**Branch:** `cursor/mail-web-ios-pwa-onboarding-8521`

**Yapılacaklar:**
- `MailNotificationsSettingsPanel`: iOS Safari tespiti + “Ana ekrana ekle” adımları (mevcut doc özet).
- İlk ziyaret `localStorage` ile tek seferlik banner (`MailPwaRegister` yakını).

**Kabul:**
- iOS user-agent fixture veya dokümantasyonlu manuel M5 adımı.

---

### MW-10 — CAP UI cilası

**Branch:** `cursor/mail-web-cap-inbox-polish-8521`

**Yapılacaklar:**
- Birleşik inbox: kaynak rozeti (Gmail / Microsoft / Lerta) tipografi ve kontrast.
- Filtre chip’leri; boş liste “bağlı hesap yok” / “senkron bekliyor” ayrımı.
- Spam hint (mevcut) + connected junk notu i18n.

**Kabul:**
- Canlı: lertaotoservis + lertaposta filtreleri okunaklı.
- EN locale’de rozet metinleri.

---

### MW-11 — Kampanya paneli (görsel, kod hazır API)

**Branch:** `cursor/mail-web-campaign-stats-ui-8521`

**Yapılacaklar:**
- `MailCampaignHistoryPanel`: open/click özet kartları, boş durum, yükleme hatası.
- Blok editörü ayrı lazy chunk (MW-02 ile koordineli).

**Kabul:**
- Mock veya staging kampanyada sayılar görünür; Mailchimp seviyesi iddia edilmez.

---

## P2 — İnce ayar ve test

### MW-12 — Klavye `j`/`k` + Shift seçim

**Branch:** `cursor/mail-web-keyboard-jk-range-8521`

**Yapılacaklar:**
- `useMailClientController` veya shell: liste odaklı gezinme; Shift+tık aralık (roadmap G2+).
- `MailShortcutsDialog` güncelle.

**Kabul:**
- `?` dialog’da documented; manuel test senaryosu PR’da.

---

### MW-13 — Yanıt alıntısı WYSIWYG

**Branch:** `cursor/mail-web-reply-quote-wysiwyg-8521`

**Yapılacaklar:**
- `MailReplyQuotePreview`: gönderim öncesi HTML önizleme Outlook’a yakın spacing/blockquote.

**Kabul:**
- Görsel karşılaştırma ekran görüntüsü; regressions mime testleri API’de kalır.

---

### MW-14 — Playwright genişletme

**Branch:** `cursor/mail-web-e2e-compose-settings-8521`

**Yapılacaklar:**
- `e2e/settings-display.spec.ts`: locale + timezone select (mock auth veya test user env).
- `e2e/compose-open.spec.ts`: “Yaz” butonu overlay (storage state).

**Kabul:**
- CI: `npm run test:mail-e2e` PASS (local webServer).

---

### MW-15 — Native shell (faz kapısı)

**Branch:** `cursor/mail-web-capacitor-deeplinks-8521`

**Yapılacaklar:**
- `docs/MAIL_POSTA_NATIVE_SHELL.md` ile uyumlu: universal link stub, status bar rengi `viewport.themeColor`.
- Build script referansı; mail-web’de minimal `capacitor` config pointer (repo kök script).

**Kabul:**
- Android/iOS build ops’ta; PR sadece web hazırlığı + dokümantasyon.

---

## Önerilen sprint sırası (2 haftalık teknik dilim)

| Hafta | PR’lar | Hedef |
|-------|--------|--------|
| 1 | MW-01 → MW-02 → MW-06 | Performans + uyarılar + pilot mesaj |
| 2 | MW-03 → MW-04 | Tam EN/TR webmail |
| 3 | MW-05 → MW-09 → MW-10 | Entegrasyon UX + PWA + CAP |
| 4 | MW-07 → MW-08 → MW-11 | Görsel sistem + vitrin + kampanya |
| 5 | MW-12 → MW-14 | Klavye + E2E |
| 6+ | MW-13, MW-15 | Alıntı + native |

---

## Her PR için standart checklist

```bash
npm run build -w @lerta/mail-web
npm run test:mail-e2e   # MW-03+ sonrası
bash scripts/verify-posta-https.sh  # deploy sonrası ops
```

**PR başlık örneği:** `feat(mail-web): lazy-load campaign and calendar panels (MW-02)`

---

## Referanslar

- [MAIL_WEBMAIL_UX_BENCHMARK.md](./MAIL_WEBMAIL_UX_BENCHMARK.md)
- [MAIL_WEBMAIL_UX_ROADMAP.md](./MAIL_WEBMAIL_UX_ROADMAP.md)
- [MAIL_PRELAUNCH_COMPETITIVE_GATE_2026-10-24.md](./MAIL_PRELAUNCH_COMPETITIVE_GATE_2026-10-24.md)
- [CUSTOMER_READY_GATE.md](./CUSTOMER_READY_GATE.md)
