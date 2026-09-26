import Link from "next/link";

export const metadata = {
  title: "IMAP — Thunderbird / Outlook | Lerta Posta",
  description: "Harici e-posta istemcisi kurulum rehberi",
};

export default function ImapHelpPage() {
  return (
    <main className="mail-help-page">
      <p className="mail-help-back">
        <Link href="/mail">← Webmail</Link>
      </p>
      <h1>Thunderbird / Outlook — IMAP</h1>
      <p>
        Kurumsal kutunuzu masaüstü istemciye bağlamak için webmail{" "}
        <strong>Ayarlar → IMAP</strong> bölümünden şifre oluşturun.
      </p>

      <h2>Sunucu ayarları</h2>
      <ul>
        <li>
          <strong>Gelen (IMAP):</strong> sunucu adı Ayarlar ekranında görünür
          (genelde <code>mail.lerta.tr</code>), port <code>993</code>, SSL/TLS
        </li>
        <li>
          <strong>Kullanıcı:</strong> tam e-posta adresiniz
        </li>
        <li>
          <strong>Şifre:</strong> webmail’de oluşturduğunuz IMAP şifresi (bir kez
          gösterilir)
        </li>
      </ul>

      <h2>Giden posta (SMTP)</h2>
      <ul>
        <li>
          Sunucu ve port: webmail <strong>Ayarlar → IMAP</strong> altında{" "}
          <strong>Giden (SMTP)</strong> satırı (genelde port 587 STARTTLS)
        </li>
        <li>Kullanıcı ve şifre: IMAP ile aynı</li>
        <li>Gönderim hatası: önce webmailden deneyin, şifreyi yenileyin</li>
      </ul>

      <h2>Thunderbird</h2>
      <ol>
        <li>Hesap ekle → E-posta → manuel yapılandırma</li>
        <li>Gelen sunucusu: IMAP, SSL, yukarıdaki bilgiler</li>
        <li>
          Giden: SMTP, Ayarlar ekranındaki host/port; kimlik doğrulama açık,
          STARTTLS veya SSL ekrandaki gibi
        </li>
      </ol>

      <h2>Webmail ile uyum</h2>
      <p>
        Arşiv ve çöp klasörleri IMAP üzerinden webmail ile uyumludur. Gönderilen
        klasörü her ortamda dolu olmayabilir; önemli gönderiler için webmail
        gönderilen kutusunu kullanın.
      </p>

      <h2>Güvenlik</h2>
      <ul>
        <li>Şifreyi yenilediğinizde eski istemci bağlantısı kesilir.</li>
        <li>
          Siteyi her zaman{" "}
          <code>https://posta.lerta.com.tr</code> üzerinden açın.
        </li>
      </ul>

      <h2>Mobil bildirim</h2>
      <p>
        iPhone’da tarayıcı sekmesinde push çalışmaz; uygulamayı{" "}
        <strong>Ana ekrana ekleyin</strong> ve Ayarlar → Bildirim’i açın.
      </p>

      <p className="mail-help-muted">
        Operatör dokümantasyonu: repo <code>docs/MAIL_THUNDERBIRD_IMAP.md</code>
      </p>
    </main>
  );
}
