import { CONSOLE_URL, MAIL_WEB_URL, MESSAGING_LOGIN_URL } from "./marketingUrls";

export type GuideCategory = "posta" | "mesaj" | "fatura" | "guven";

export const GUIDE_CATEGORY_LABELS: Record<GuideCategory, string> = {
  posta: "Posta",
  mesaj: "Mesaj",
  fatura: "Fatura & plan",
  guven: "Güven",
};

export type GuideSection = {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type MarketingGuide = {
  slug: string;
  title: string;
  summary: string;
  category: GuideCategory;
  readMinutes: number;
  sections: GuideSection[];
};

const consoleBase = CONSOLE_URL.replace(/\/$/, "");
const webmailLogin = `${MAIL_WEB_URL.replace(/\/$/, "")}/login`;

export const MARKETING_GUIDES: MarketingGuide[] = [
  {
    slug: "dns-mx-spf-dkim-dmarc",
    title: "DNS: MX, SPF, DKIM ve DMARC",
    summary:
      "Kurumsal posta için alan adı kayıtları ve yönetim konsolunda doğrulama.",
    category: "posta",
    readMinutes: 6,
    sections: [
      {
        paragraphs: [
          "Kurumsal Lerta Posta, alan adınızın DNS panelinde MX ve gönderim güvenliği kayıtlarının doğru olmasına bağlıdır. Kayıtları alan adı sağlayıcınızda (registrar) siz eklersiniz; Lerta yönetim konsolu her adımı doğrular.",
        ],
      },
      {
        heading: "Adımlar",
        paragraphs: ["Organizasyon yöneticisi olarak:"],
        bullets: [
          `${consoleBase} adresinde oturum açın ve domain bölümüne gidin.`,
          "Konsolun gösterdiği MX, SPF (TXT), DKIM (CNAME/TXT) ve DMARC (TXT) değerlerini DNS panelinize ekleyin.",
          "DNS yayılımı 15 dakika ile 48 saat sürebilir; konsolda “Doğrulandı” durumunu bekleyin.",
          "Test e-postası göndererek gelen/giden kutusunu kontrol edin.",
        ],
      },
      {
        heading: "Sık hata",
        paragraphs: [
          "Eski MX kayıtları silinmeden yeni MX eklenmesi teslimatı bozar. Tek bir SPF TXT kaydı olmalı; birden fazla SPF birleştirilmelidir.",
        ],
      },
    ],
  },
  {
    slug: "webmail-giris",
    title: "Webmail girişi",
    summary: "posta.lerta.com.tr üzerinden tarayıcıdan kurumsal posta.",
    category: "posta",
    readMinutes: 2,
    sections: [
      {
        paragraphs: [
          `Webmail adresi: ${webmailLogin}. Tam e-posta adresiniz (ör. ad@firmaniz.com.tr) ve şifrenizle giriş yapın.`,
        ],
      },
      {
        heading: "İlk giriş",
        bullets: [
          "Şifrenizi yönetici veya kayıt akışından aldınız; unuttuysanız yöneticinizden sıfırlama isteyin.",
          "İki adımlı doğrulama açıksa authenticator uygulamasındaki kodu girin.",
          "Mobil tarayıcıda “Ana ekrana ekle” ile PWA benzeri kısayol kullanılabilir.",
        ],
      },
    ],
  },
  {
    slug: "outlook-imap-kurulum",
    title: "Outlook / Thunderbird (IMAP)",
    summary: "Masaüstü istemcide IMAP ve SMTP ayarları.",
    category: "posta",
    readMinutes: 5,
    sections: [
      {
        paragraphs: [
          "Yönetim konsolunda domain doğrulandıktan sonra IMAP ile posta kutunuzu senkronize edebilirsiniz. Sunucu adları ve portlar hesabınıza özel olarak konsolda listelenir; aşağıdaki değerler tipik SSL yapılandırmasıdır.",
        ],
      },
      {
        heading: "SSL (önerilen)",
        bullets: [
          "Gelen (IMAP): port 993, şifreleme SSL/TLS",
          "Giden (SMTP): port 465 veya 587 (STARTTLS), kimlik doğrulama açık",
          "Kullanıcı adı: tam e-posta adresi",
        ],
      },
      {
        paragraphs: [
          "Kurulum sonrası gönderim hatası alırsanız SPF/DKIM durumunu konsoldan kontrol edin veya destek@lerta.com.tr adresine hata kodunu iletin.",
        ],
      },
    ],
  },
  {
    slug: "mobil-posta-imap",
    title: "iPhone / Android posta uygulaması",
    summary: "Mobil cihazda IMAP hesabı ekleme.",
    category: "posta",
    readMinutes: 4,
    sections: [
      {
        paragraphs: [
          "iOS Mail veya Android Gmail/Outlook uygulamasında “Diğer” veya “IMAP” hesabı seçin. Sunucu bilgilerini yönetim konsolundan kopyalayın.",
        ],
        bullets: [
          "Tam e-posta adresi ve şifre",
          "IMAP ve SMTP sunucu adları (genelde mail sunucunuz veya konsoldaki host)",
          "SSL açık, IMAP 993 / SMTP 465 veya 587",
        ],
      },
    ],
  },
  {
    slug: "mesaj-giris-sohbet",
    title: "Mesaj girişi ve sohbet",
    summary: "u88.lerta.com.tr üzerinden ekip sohbeti.",
    category: "mesaj",
    readMinutes: 3,
    sections: [
      {
        paragraphs: [
          `Mesaj girişi: ${MESSAGING_LOGIN_URL}. Kurumsal hesabınızla oturum açtıktan sonra sohbet sekmesine yönlendirilirsiniz.`,
        ],
      },
      {
        bullets: [
          "Lojistik (app.lerta.com.tr) arayüzü açılmaz; yalnızca mesajlaşma deneyimi kullanılır.",
          "Kanallara davet yönetici veya kanal yöneticisi tarafından yapılır.",
          "Tarayıcı bildirimlerini etkinleştirerek anlık uyarı alabilirsiniz.",
        ],
      },
    ],
  },
  {
    slug: "mesaj-bildirimler",
    title: "Bildirimler ve mobil",
    summary: "Web push ve mobil uygulama bildirimleri.",
    category: "mesaj",
    readMinutes: 3,
    sections: [
      {
        paragraphs: [
          "Mesaj web uygulamasında tarayıcı bildirim izni istenir. Kurumsal mobil uygulama dağıtımınız varsa push token yönetim konsolundan yapılandırılır.",
        ],
      },
      {
        paragraphs: [
          "Bildirim gelmiyorsa: tarayıcı izinleri, odak modu (iOS) ve kurumsal VPN/firewall kurallarını kontrol edin.",
        ],
      },
    ],
  },
  {
    slug: "kopru-paketleri",
    title: "WhatsApp / Slack köprüleri",
    summary: "Kurumsal köprü paketleri ve satış süreci.",
    category: "mesaj",
    readMinutes: 3,
    sections: [
      {
        paragraphs: [
          "Köprü entegrasyonları Enterprise veya ayrı paket kapsamındadır. Teknik ön koşullar ve fiyat için satis@lerta.com.tr veya /iletisim formunu kullanın.",
        ],
      },
    ],
  },
  {
    slug: "plan-odeme-yukseltme",
    title: "Plan, ödeme ve yükseltme",
    summary: "Kayıt sonrası faturalama ve plan değişikliği.",
    category: "fatura",
    readMinutes: 4,
    sections: [
      {
        paragraphs: [
          `Kurumsal ve Enterprise planlarda ödeme yönetim panelinden (Stripe veya iyzico, ortama göre) yapılır. Yükseltme: ${consoleBase}/upgrade`,
        ],
        bullets: [
          "Fatura e-postası ve vergi bilgileri panelde güncellenir.",
          "Pilot plandan kurumsala geçişte DNS doğrulama gerekebilir.",
          "EUR/TRY tutarları vitrin katalog API’sinden gelir.",
        ],
      },
    ],
  },
  {
    slug: "abonelik-iptal",
    title: "Abonelik iptali",
    summary: "Dönem sonu iptal ve pilot plana dönüş.",
    category: "fatura",
    readMinutes: 3,
    sections: [
      {
        paragraphs: [
          "Hesap sahibi veya faturalama yöneticisi yönetim konsolunda faturalama bölümünden dönem sonu iptal seçebilir. Veri saklama süreleri sözleşme ve KVKK metnine tabidir.",
        ],
      },
    ],
  },
  {
    slug: "iki-asamali-dogrulama",
    title: "İki adımlı doğrulama (2FA)",
    summary: "TOTP ile hesap güvenliği.",
    category: "guven",
    readMinutes: 3,
    sections: [
      {
        paragraphs: [
          "Yönetici, organizasyon veya kullanıcı düzeyinde TOTP açabilir. Authenticator uygulamasındaki QR kodu tarayın; yedek kodları güvenli saklayın.",
        ],
      },
    ],
  },
  {
    slug: "teslimat-guvenligi",
    title: "Teslimat ve gönderim güvenliği",
    summary: "SPF, DKIM, DMARC ve itibar.",
    category: "guven",
    readMinutes: 5,
    sections: [
      {
        paragraphs: [
          "Giden posta DKIM imzalı gönderilir. SPF ve DMARC kayıtları alıcı sunucuların güven değerlendirmesini etkiler.",
        ],
        bullets: [
          "DNS rehberi: /rehberler/dns-mx-spf-dkim-dmarc",
          "Güven merkezi özeti: /guven",
          "Şüpheli trafik veya spam şikayeti: destek@lerta.com.tr",
        ],
      },
    ],
  },
];

export function getGuideBySlug(slug: string): MarketingGuide | undefined {
  return MARKETING_GUIDES.find((g) => g.slug === slug);
}

export function guidesByCategory(category: GuideCategory): MarketingGuide[] {
  return MARKETING_GUIDES.filter((g) => g.category === category);
}
