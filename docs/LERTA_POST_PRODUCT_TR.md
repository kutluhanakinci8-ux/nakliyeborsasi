# Lerta Post — ürün modeli

## Adres formatı

Müşteri tek satır yazır: **`{istediği-ön-ek}@{firma-adi}.post`**

| Örnek | Açıklama |
|--------|-----------|
| `info@abayer.post` | Klasik kurumsal |
| `abayer@abayer.post` | Ön ek firma adı da olabilir |
| `info@kutluhan.post` | Başka firma |

- `@` öncesi: `info`, isim, departman — küçük harf, rakam, `.` `-` `_`
- `@` sonrası: firma kısa adı + sabit **`.post`** (Lerta Posta uzantısı)
- Arka planda teknik alan: `{firma}.post.lerta.com.tr` (müşteri DNS yapmaz)

## Kanuni çerçeve (özet, hukuk danışmanına sorun)

- **ICANN `.post` TLD** Evrensel Posta Birliği (UPU) altında; siz **`.post` TLD kaydı satmıyorsunuz**.
- Satış: **Lerta Posta** markası altında `*.post` **görünen adres** + `*.post.lerta.com.tr` **barındırma**.
- Sözleşmede: teknik barındırma alanı `lerta.com.tr`, görünen ürün adı “Lerta Post”, müşteri `firma.post` adresini kiralıyor.
- UPU/marka çakışması riski için Türkiye’de marka tescili ve KVKK metinleri önerilir — nihai metin avukata bırakılır.

## Gönderim

- **From (alıcı görür):** `info@firma.post`
- **SMTP / DKIM:** `firma.post.lerta.com.tr` (OpenDKIM `*@firma.post` → bu anahtar)
