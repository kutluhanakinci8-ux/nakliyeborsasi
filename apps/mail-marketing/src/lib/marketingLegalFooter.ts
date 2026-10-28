/** Alt yasal şerit — TR öncelikli, çok ülke genişlemesine hazır etiketler. */

export type FooterLegalLink = {
  href: string;
  label: string;
  /** Gelecekte bölgeye göre filtre için (ör. EU → GDPR metni). */
  regions?: ("tr" | "eu" | "global")[];
};

export const FOOTER_LOCALE_LABEL = "Türkçe (Türkiye)";

export const FOOTER_LEGAL_LINKS: FooterLegalLink[] = [
  { href: "/iletisim", label: "Lerta'ya başvurun", regions: ["global"] },
  { href: "/kvkk", label: "Gizlilik ve KVKK", regions: ["tr", "global"] },
  { href: "/gizlilik-tercihleri", label: "Gizlilik tercihleriniz", regions: ["global"] },
  { href: "/cerez", label: "Tanımlama bilgilerini yönetin", regions: ["global"] },
  { href: "/kullanim-sartlari", label: "Kullanım şartları", regions: ["global"] },
  { href: "/marka", label: "Ticari markalar", regions: ["global"] },
];

export const FOOTER_LEGAL_NOTE =
  "Hizmet bölgeleri genişledikçe yerel veri koruma metinleri (KVKK, GDPR vb.) bu alandan erişilebilir olacaktır.";
