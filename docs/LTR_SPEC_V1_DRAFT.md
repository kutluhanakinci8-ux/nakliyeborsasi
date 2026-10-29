# LTR (Lerta Document) — format spec v1.0 (taslak)

**Durum:** F0 iskelet · **Şema:** `lerta/ltr/1.0`  
**Uzantı:** `.ltr` · **MIME (taslak):** `application/vnd.lerta.document+html`

---

## 1. Amaç

Operasyonel belgeleri (teklif, özet rapor, kapasite listesi) PDF’den daha zengin ama **tek dosya** olarak taşımak. Resmi e-belge (UBL/e-Fatura) kapsam dışı; arşiv için PDF export desteklenir.

---

## 2. Modlar

| Mod | Dağıtım | Offline | Güncelleme | Analitik |
|-----|---------|---------|------------|----------|
| **sealed** | E-posta/mesaj eki | Evet | Dosya sabit | Hayır |
| **linked** | HTTPS link + opsiyonel ek | Hayır (canlı) | Sunucu sürümü | Opsiyonel (F4) |

F0–F1 yalnızca **sealed** mühürlü HTML zorunlu.

---

## 3. Sealed dosya (normatif)

1. Tek geçerli **UTF-8 HTML5** dosyası, uzantı `.ltr`.
2. **Mühürlü:** Render için harici ağ isteği yok (CSS/JS inline). Uzak görsel tolere edilir; yoksa belge anlamlı kalmalı.
3. `<head>` içinde:
   - `<meta name="ltr" content="1.0">`
   - `<script type="application/ltr+json" id="ltr-content">…</script>` — tek satır JSON, `</script>` kaçışı: `<\/script`
4. `<body>` manifestteki blokları insan okur + erişilebilir şekilde render eder.
5. `prefers-color-scheme` ile açık/koyu.

---

## 4. Manifest (id=`ltr-content`)

```json
{
  "schema": "lerta/ltr/1.0",
  "lang": "tr",
  "mode": "sealed",
  "title": "…",
  "subtitle": "…",
  "meta": {
    "author": "…",
    "organization": "…",
    "createdAt": "2026-10-29T00:00:00+03:00",
    "generator": "…"
  },
  "blocks": []
}
```

### Blok tipleri (v1)

| type | Açıklama |
|------|----------|
| `markdown` | `md` — sınırlı markdown |
| `callout` | `tone`: info \| ok \| warn, `text` |
| `kpis` | `items[]`: value, label, delta? |
| `table` | columns[], rows[][] |
| `chart` | chart, title, data[] (SVG render) |
| `section` | title, blocks[] (iç içe) |
| `quote` | text, cite? |
| `image` | src (data URL veya https), alt, caption? |

---

## 5. Doğrulama

- `@nakliyeborsasi/core/ltr` → `validateLtrManifest(json)`  
- JSON Schema: `apps/web/public/ltr/spec/ltr-1.0.schema.json`

---

## 6. Sürümleme

- Patch: yeni opsiyonel manifest alanları; eski viewer yok sayar.
- Minor: yeni blok tipi; viewer bilinmeyeni “düz metin” gösterir.
- Major: `meta name="ltr" content="2.0"` — yeni şema.

---

## 7. Güvenlik

- `.ltr` = HTML; XSS için viewer sandbox / CSP (F1 viewer dokümanı).
- Linked mod: sunucu tarafı auth, rate limit, KVKK log (F4).
