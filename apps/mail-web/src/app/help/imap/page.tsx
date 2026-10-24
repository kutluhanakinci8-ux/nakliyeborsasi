import Link from "next/link";

export const metadata = {
  title: "Yardım — IMAP / SMTP | Lerta Posta",
  description: "Harici e-posta istemcisi kurulum rehberi",
};

export default function ImapHelpPage() {
  return (
    <main className="mail-help-page mail-help-page--premium">
      <p className="mail-help-back">
        <Link href="/mail">← Webmail</Link>
      </p>
      <header className="mail-help-hero">
        <h1>Thunderbird / Outlook — IMAP</h1>
        <p className="mail-help-hero-lead">
          Kurumsal kutunuzu masaüstü veya mobil istemciye bağlayın. Tüm sunucu
          bilgileri ve IMAP şifresi webmail{" "}
          <strong>Ayarlar → IMAP ve SMTP</strong> ekranından alınır.
        </p>
      </header>

      <section className="mail-help-card">
        <h2>İlk adım: IMAP şifresi</h2>
        <ol className="mail-help-steps">
          <li>Webmailde <strong>Ayarlar → IMAP ve SMTP</strong> açın.</li>
          <li>
            <strong>IMAP şifresi oluştur</strong> (ilk kurulum) veya mevcut şifreyi{" "}
            <strong>yenile</strong>.
          </li>
          <li>
            Şifre yalnızca bir kez gösterilir — <strong>Tüm bilgileri kopyala</strong>{" "}
            ile kaydedin; e-posta ile gönderilmez.
          </li>
        </ol>
      </section>

      <section className="mail-help-card">
        <h2>Sunucu ayarları</h2>
        <ul className="mail-help-list">
          <li>
            <strong>Gelen (IMAP):</strong> host ve port Ayarlar ekranında (genelde{" "}
            <code>mail.lerta.com.tr:993</code>, SSL/TLS)
          </li>
          <li><strong>Kullanıcı:</strong> tam kurumsal e-posta adresiniz</li>
          <li><strong>Şifre:</strong> webmailde oluşturduğunuz IMAP şifresi</li>
        </ul>
      </section>

      <section className="mail-help-card">
        <h2>Giden posta (SMTP)</h2>
        <ul className="mail-help-list">
          <li>
            <strong>Giden (SMTP):</strong> aynı menüde; genelde port{" "}
            <code>587</code> STARTTLS
          </li>
          <li>Kimlik doğrulama: IMAP ile aynı kullanıcı ve şifre</li>
          <li>Gönderim hatası: önce webmailden deneyin, gerekirse şifreyi yenileyin</li>
        </ul>
      </section>

      <section className="mail-help-card">
        <h2>Thunderbird</h2>
        <ol className="mail-help-steps">
          <li>Hesap ekle → E-posta → manuel yapılandırma</li>
          <li>Gelen: IMAP, SSL, webmaildeki host/port</li>
          <li>Giden: SMTP, kimlik doğrulama açık, STARTTLS veya ekrandaki güvenlik</li>
        </ol>
      </section>

      <section className="mail-help-card">
        <h2>Webmail ile uyum</h2>
        <p>
          Arşiv ve çöp klasörleri IMAP ile uyumludur. Gönderilen klasörü her istemcide
          dolu olmayabilir; önemli gönderiler için webmail gönderilen kutusunu kullanın.
          <strong> Posta kuralları</strong>, <strong>otomatik yanıtlar</strong> ve{" "}
          <strong>bildirimler</strong> yalnızca webmail ayarlarından yönetilir.
        </p>
      </section>

      <section className="mail-help-card">
        <h2>Güvenlik</h2>
        <ul className="mail-help-list">
          <li>Şifre yenilendiğinde eski istemci bağlantısı kesilir.</li>
          <li>
            Adres:{" "}
            <code>https://posta.lerta.com.tr</code> — iki adımlı doğrulama Ayarlar →
            Güvenlik.
          </li>
        </ul>
      </section>

      <section className="mail-help-card">
        <h2>Mobil bildirim (PWA)</h2>
        <p>
          iPhone’da tarayıcı sekmesinde push çalışmaz. Paylaş →{" "}
          <strong>Ana ekrana ekle</strong>, uygulamayı ana ekrandan açın, sonra{" "}
          <strong>Ayarlar → Bildirimler ve sesler</strong> ile Web Push’u açın.
        </p>
      </section>

      <p className="mail-help-muted">
        Operatör dokümantasyonu: <code>docs/MAIL_THUNDERBIRD_IMAP.md</code>
      </p>
    </main>
  );
}
