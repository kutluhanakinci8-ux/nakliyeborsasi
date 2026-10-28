import { CONSOLE_URL, MESSAGING_APP_URL } from "./marketingUrls";
import { MARKETING_KVKK_PRODUCT_ENABLED } from "./marketingFeatureFlags";

const consoleBase = CONSOLE_URL.replace(/\/$/, "");

export type FaqItem = { q: string; a: string };

/** SSS — Lerta Posta + Mesaj platformu. */
export const MARKETING_FAQ: FaqItem[] = [
  {
    q: "Lerta kimler için?",
    a: "Kendi alan adıyla kurumsal posta ve firma mesajlaşması isteyen KOBİ ve ekipler; pilot deneme veya Enterprise ölçeğinde markalar.",
  },
  {
    q: "Lerta Posta kimler için?",
    a: "Kendi alan adıyla kurumsal posta isteyen KOBİ ve ekipler; pilot alt alanda denemek isteyen bireysel kullanıcılar ve Enterprise ihtiyacı olan markalar.",
  },
  {
    q: "Lerta Mesaj nedir?",
    a: "Ekip içi sohbet, dosya paylaşımı, bildirimler ve WhatsApp/Slack köprüleri. Giriş u88.lerta.com.tr üzerinden; lojistik arayüzü açılmaz.",
  },
  {
    q: "Özel domain zorunlu mu?",
    a: "Kurumsal ve Enterprise posta paketlerinde hedef model info@firmaniz.com.tr. Pilot pakette hemen kullanabileceğiniz adres örneği karagoz@lerta.com.tr.",
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
    a: "Katalog API üzerinden gelir; uluslararası kartlar için EUR, Türkiye ödemeleri için TRY tutarları gösterilir.",
  },
  {
    q: "Mesajlaşma fiyatlandırması nerede?",
    a: "Posta planları /posta sayfasında listelenir; Mesaj ekip erişimi kurumsal hesap ile açılır. Kurumsal köprü paketleri için /iletisim üzerinden teklif alın.",
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
    q: "Sohbet uygulaması nerede?",
    a: `${MESSAGING_APP_URL.replace("https://", "")} — üst menüden Sohbeti aç veya Giriş yap.`,
  },
  {
    q: "Veriler nerede barındırılıyor?",
    a: "Lerta Posta ve Mesaj altyapısı Türkiye'de barındırılır. Özet: /guven sayfası ve KVKK metni.",
  },
  {
    q: "KVKK veri taleplerim?",
    a: `Yönetim konsolunda Gizlilik bölümünden veri dışa aktarma ve hesap silme self-servis. Özet metin: vitrin /kvkk sayfası.`,
  },
  {
    q: "Hizmet durumu nereden izlenir?",
    a: "Canlı durum /durum sayfası ve status API; planlı bakım duyuruları destek kanalından. SLA özeti: /sla",
  },
  {
    q: "Lerta Logistics ile ilişki?",
    a: "Bağımsız ürünler. Lerta platformu lerta.com.tr; lojistik platformu lerta.tr.",
  },
];

export const MARKETING_FAQ_ACTIVE = MARKETING_FAQ.filter(
  (item) => MARKETING_KVKK_PRODUCT_ENABLED || !item.q.includes("KVKK"),
);
