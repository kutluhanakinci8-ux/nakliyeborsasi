import Link from "next/link";

export default function AdminOverviewPage() {
  return (
    <section className="account-card module-panel module-panel--elevated">
      <h2 className="account-card-title">Yönetim özeti</h2>
      <p className="account-card-lead">
        Organizasyon sayfasındaki her alan (doğrulama rozetleri, temel bilgiler,
        koridorlar, iletişim, askıya alma) admin panelden düzenlenir ve kullanıcı
        tarafında anında yansır.
      </p>
      <ul className="admin-checklist">
        <li>Güven ve doğrulama — e-posta, belge durumu, tam doğrulama, öne çıkarma</li>
        <li>Temel bilgiler — ticari / resmi unvan, vergi, ülke, şehir</li>
        <li>Koridor yetkileri — TR, UA, EU</li>
        <li>İletişim — birincil e-posta, telefon, web</li>
        <li>Operasyon — ilan / ihale kilidi, hesap dondurma</li>
        <li>Denetim — son işlemler günlüğü</li>
      </ul>
      <Link href="/admin/organizasyon" className="btn-account-primary">
        Organizasyon yönetimine git
      </Link>
    </section>
  );
}
