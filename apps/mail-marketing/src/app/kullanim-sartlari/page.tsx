import {
  MarketingLegalPage,
  legalMetadata,
} from "@/components/MarketingLegalPage";

export const metadata = legalMetadata(
  "Kullanım şartları — Lerta",
  "Lerta Posta ve Mesaj hizmetlerinin kullanım koşulları (özet).",
);

export default function TermsPage() {
  return (
    <MarketingLegalPage
      title="Kullanım şartları"
      description=""
      heading="Kullanım şartları (özet)"
    >
      <p>
        Lerta kurumsal posta ve mesajlaşma hizmetlerini kullanırken geçerli olan
        genel hükümlerin özeti. Tam metin, abonelik sözleşmesi ve seçilen plan
        ile birlikte geçerlidir.
      </p>
      <h2>Hizmet kapsamı</h2>
      <p>
        Hizmet bölgesi ve veri konumu abonelik planına göre belirlenir. Türkiye
        müşterileri için birincil barındırma Türkiye&apos;dedir; yurt dışı
        genişlemede bölgesel ekler yayımlanacaktır.
      </p>
      <h2>Hesap ve uygun kullanım</h2>
      <p>
        Kiracı izolasyonu, spam ve kötüye kullanım politikalarına uyum zorunludur.
        İhlallerde hesap askıya alınabilir.
      </p>
    </MarketingLegalPage>
  );
}
