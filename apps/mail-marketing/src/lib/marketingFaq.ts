import { CONSOLE_URL } from "./marketingUrls";

const consoleBase = CONSOLE_URL.replace(/\/$/, "");

export type FaqItem = { q: string; a: string };

/** SSS — ürün ve faturalama ile uyumlu (A5). */
export const MARKETING_FAQ: FaqItem[] = [
  {
    q: "Lerta Mail kimler için?",
    a: "Kendi alan adıyla kurumsal posta isteyen KOBİ ve ekipler; pilot alt alanda denemek isteyen bireysel kullanıcılar ve Enterprise ihtiyacı olan markalar.",
  },
  {
    q: "Özel domain zorunlu mu?",
    a: "Kurumsal ve Enterprise paketlerde hedef model info@firmaniz.com.tr. Pilot pakette hemen kullanabileceğiniz adres örneği karagoz@lerta.com.tr.",
  },
  {
    q: "DNS kayıtlarını kim ekler?",
    a: "Alan adınızın panelinde (ör. isimtescil) MX, SPF, DKIM ve DMARC kayıtlarını siz ekler; yönetim konsolu doğrulamayı adım adım gösterir.",
  },
  {
    q: "Ödeme nasıl yapılır?",
    a: `Kayıt sonrası yönetim panelinde Kurumsal veya Enterprise için kart ile ödeme (Stripe veya iyzico, sunucu yapılandırmasına bağlı). Plan yükseltme: ${consoleBase}/upgrade`,
  },
  {
    q: "Fiyatlar vitrinde neden EUR ve TRY görünüyor?",
    a: "Katalog API üzerinden gelir; uluslararası kartlar için EUR, Türkiye ödemeleri için TRY tutarları gösterilir. Canlı iyzico tutarları sunucu env ile katalogda uyumlu tutulmalıdır.",
  },
  {
    q: "Aboneliği iptal edebilir miyim?",
    a: "Evet. Yönetim panelinde faturalama bölümünden dönem sonu iptal veya pilot plana düşüş seçenekleri (rol: hesap sahibi / faturalama yöneticisi).",
  },
  {
    q: "Enterprise ile Kurumsal farkı?",
    a: "Enterprise: white-label (logo, gönderen adı), public API ve webhook entegrasyonu. Detaylar plan kartında ve satış iletişiminde.",
  },
  {
    q: "Webmail nerede?",
    a: "posta.lerta.com.tr — firma hesabınızla giriş. İsteğe bağlı iki adımlı doğrulama (TOTP) yönetim panelinden açılabilir.",
  },
  {
    q: "KVKK veri taleplerim?",
    a: `Yönetim konsolunda Gizlilik bölümünden veri dışa aktarma ve hesap silme self-servis. Özet metin: vitrin /kvkk sayfası.`,
  },
  {
    q: "Hizmet durumu nereden izlenir?",
    a: "Vitrin /durum sayfası ve status API; planlı bakım duyuruları destek kanalından.",
  },
  {
    q: "Lerta Logistics ile ilişki?",
    a: "Bağımsız ürünler. Lerta Mail lerta.com.tr; lojistik platformu lerta.tr.",
  },
];
