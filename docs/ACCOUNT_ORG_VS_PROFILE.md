# Hesap: Organizasyon vs Profil

Nakliye Borsası’nda iki ayrı “hesap” katmanı vardır. Karışıklığı önlemek için rakip platformlardaki yaygın modeli özümseyip UI’da net ayırıyoruz.

## Rakip özet tablosu

| Platform | Firma / organizasyon | Kişisel kullanıcı |
|----------|----------------------|-------------------|
| **TIMOCOM** | Hesap transferi, kullanıcı ekleme (yönetici), firma düzeyi üyelik | Ayarlar → Login: şifre; kişisel **dışlama listesi**; her çalışanın **tek e-posta + tek oturum** |
| **Transporeon** | Admin System: kullanıcı master data; Visibility’de admin: roller, yerler, filtreler, araç | Kişisel master data merkezi admin’de; ürün içi rol ayrı |
| **Uber Freight / Convoy (genel B2B)** | Company profile, billing entity, compliance | User profile, notifications, MFA |

### Artılar (seçtiğimiz model)

- **Net sorumluluk:** Vergi unvanı, doğrulama, koridor, abonelik → organizasyon; ad, dil, bildirim, şifre → profil.
- **Denetim:** Fatura yöneticisi organizasyon/abonelik; dispatch profil bildirimlerini yönetir.
- **Ölçek:** Çok kullanıcılı firmada kurumsal veri tek yerde güncellenir.

### Eksikler / riskler (bilinçli)

- İki sekme = bir tık daha fazla navigasyon (yan menü ile giderilir).
- Demo verisi hâlâ localStorage (API persist gelene kadar org/profil senkronu manuel).
- Abonelik API + ödemeler demo’su birleştirilmeye devam ediyor.

## Nakliye Borsası eşlemesi

| Sekme | Kapsam | Veri |
|-------|--------|------|
| **Benim organizasyonum** | Ticari kimlik, web zenginleştirme, doğrulama, koridorlar, **firma iletişimi**, **abonelik / modüller** | `nb-organization-profile:*`, abonelik API |
| **Benim profilim** | Görünen ad, ünvan, kişisel telefon, dil, bildirimler, oturum / şifre | `nb-user-profile:*`, oturum |
| **Benim ödemelerim** | Kart, fatura adresi, fatura geçmişi, tahsilat | Demo `nb-company-billing:*` + abonelik API özet |

**Çalışanlarım / Filo** operasyon modülleridir; organizasyonun “insan ve varlık” uzantısıdır.

## UI farkı

- **Organizasyon:** Kurumsal hero (unvan + logo), sol **firma yönetimi** menüsü, bölüm anchor’ları.
- **Profil:** Kompakt kişisel banner (yalnızca kullanıcı avatarı), iki sütun form; firma logosu/abonelik yok.

## Sonraki adımlar

1. Organizasyon profilini REST API ile persist etmek.
2. Ödemeleri abonelik API ile tam senkron (plan etiketi, yenileme).
3. Kişisel dışlama listesi (TIMOCOM benzeri) profil altında.
4. Rol bazlı giriş yönlendirmesi (ör. `BILLING_ADMIN` → ödemeler).
