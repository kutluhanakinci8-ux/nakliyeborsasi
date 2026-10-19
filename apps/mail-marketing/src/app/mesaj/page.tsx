import { MarketingPageShell } from "@/components/MarketingPageShell";
import {
  MESSAGING_APP_URL,
  MESSAGING_LOGIN_URL,
} from "@/lib/marketingUrls";

export default function MesajProductPage() {
  return (
    <MarketingPageShell narrow>
      <p className="breadcrumb">
        <a href="/">Lerta</a> / Mesaj
      </p>
      <section className="hero">
        <p className="hero-eyebrow">Firma sohbeti</p>
        <h1>Kurumsal mesajlaşma ve kanal köprüleri</h1>
        <p className="lead">
          Ekip içi sohbet, dosya paylaşımı, bildirimler ve entegrasyon API&apos;si.
          WhatsApp ve Slack köprüleri ile müşteri iletişimini tek yerde toplayın.
        </p>
        <div className="hero-cta">
          <a className="btn btn-primary" href={MESSAGING_APP_URL}>
            Mesajlaşmayı aç
          </a>
          <a className="btn btn-ghost" href={MESSAGING_LOGIN_URL}>
            Giriş yap
          </a>
          <a className="btn btn-ghost" href="/">
            Tüm ürünler
          </a>
        </div>
      </section>

      <section className="grid">
        <article className="card">
          <h3>Gerçek zamanlı</h3>
          <p>Okundu bilgisi, yazıyor göstergesi ve anlık bildirimler.</p>
        </article>
        <article className="card">
          <h3>KVKK ve kayıt</h3>
          <p>Denetlenebilir mesaj geçmişi ve saklama politikaları.</p>
        </article>
        <article className="card">
          <h3>Entegrasyon</h3>
          <p>Webhook, public API ve üçüncü taraf kanal köprüleri.</p>
        </article>
      </section>
    </MarketingPageShell>
  );
}
