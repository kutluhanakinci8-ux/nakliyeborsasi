import { MarketingPageShell } from "@/components/MarketingPageShell";
import { CORPORATE_REGISTER, PILOT_REGISTER } from "@/lib/marketingUrls";

const FAQ = [
  {
    q: "Lerta Mail kimler için?",
    a: "Kendi alan adıyla kurumsal posta isteyen KOBİ ve ekipler ile pilot alt alanda denemek isteyen bireysel kullanıcılar için.",
  },
  {
    q: "Özel domain zorunlu mu?",
    a: "Kurumsal pakette hedef model info@firmaniz.com.tr. Pilot pakette kullanici.lerta.com.tr altında adres açabilirsiniz.",
  },
  {
    q: "DNS kayıtlarını kim ekler?",
    a: "Alan adınızın panelinde (ör. isimtescil) MX, SPF, DKIM ve DMARC kayıtlarını siz ekler; yönetim konsolu doğrulamayı kontrol eder.",
  },
  {
    q: "Webmail nerede?",
    a: "posta.lerta.com.tr — firma hesabınızla giriş yapın.",
  },
  {
    q: "Lerta Logistics ile ilişki?",
    a: "Bağımsız ürünler. Lerta Mail lerta.com.tr; lojistik platformu lerta.tr.",
  },
  {
    q: "Ödeme nasıl?",
    a: "Kurumsal plan için yönetim panelinden ödeme (kart) yakında tam entegre; şimdilik deneme planı veya destek ile aktivasyon mümkün.",
  },
];

export default function SssPage() {
  return (
    <MarketingPageShell narrow>
      <h1>Sık sorulan sorular</h1>
      <div className="faq-list">
        {FAQ.map((item) => (
          <details key={item.q} className="faq-item">
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
      <p className="pricing-lead">
        <a className="btn btn-primary" href={CORPORATE_REGISTER}>
          Kurumsal kayıt
        </a>
        <a className="btn btn-ghost" href={PILOT_REGISTER} style={{ marginLeft: 12 }}>
          Pilot kayıt
        </a>
      </p>
    </MarketingPageShell>
  );
}
