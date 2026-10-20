import { MarketingPageShell } from "@/components/MarketingPageShell";
export default function MesajProductPage() {
  return (
    <MarketingPageShell>
      <p className="breadcrumb">
        <a href="/">Lerta</a> / Mesajlaşma
      </p>
      <section className="hero">
        <p className="hero-eyebrow">Firma sohbeti</p>
        <h1>Kurumsal mesajlaşma ve kanal köprüleri</h1>
        <p className="lead">
          Ekip içi sohbet, dosya paylaşımı, bildirimler ve entegrasyon API&apos;si.
          WhatsApp ve Slack köprüleri ile müşteri iletişimini tek yerde toplayın.
        </p>
        <p className="hero-hint">
          <strong>Giriş yap</strong> ve <strong>Sohbeti aç</strong> üst menüde —
          nakliye veya lojistik arayüzü açılmaz; yalnızca Lerta Mesaj.
        </p>
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
