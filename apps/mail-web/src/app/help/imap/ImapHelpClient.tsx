"use client";

import Link from "next/link";
import { useMailLocale } from "@/lib/MailLocaleProvider";

export function ImapHelpClient() {
  const { t, locale } = useMailLocale();

  return (
    <main className="mail-help-page mail-help-page--premium">
      <p className="mail-help-back">
        <Link href="/mail">{t("helpBackWebmail")}</Link>
      </p>
      <header className="mail-help-hero">
        <h1>{t("helpImapTitle")}</h1>
        <p className="mail-help-hero-lead">{t("helpImapLead")}</p>
      </header>

      {locale === "tr" ? (
        <>
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

          <section id="outlook-mobile" className="mail-help-card">
            <h2>Outlook mobil (iOS / Android)</h2>
            <ol className="mail-help-steps">
              <li>
                Microsoft Outlook uygulamasını açın → <strong>Hesap ekle</strong>.
              </li>
              <li>
                <strong>Diğer hesap</strong> veya doğrudan <strong>IMAP</strong> seçin.
              </li>
              <li>
                E-posta adresiniz ve webmailde oluşturduğunuz <strong>IMAP şifresi</strong>.
              </li>
              <li>
                Gelen: host/port webmaildeki gibi (ör. <code>mail.lerta.com.tr:993</code>, SSL).
              </li>
              <li>
                Giden SMTP: aynı menüdeki host, port <code>587</code> (STARTTLS) veya ekrandaki
                değer; kimlik doğrulama açık.
              </li>
              <li>
                Outlook uygulamasındaki <strong>Face ID / PIN</strong> Microsoft hesabınızı korur;
                Lerta webmail biyometrisi için{" "}
                <Link href="/mail">webmail</Link> → Ayarlar → Güvenlik → Passkey kullanın.
              </li>
            </ol>
          </section>

          <section className="mail-help-card">
            <h2>Outlook (Windows / Mac masaüstü)</h2>
            <ol className="mail-help-steps">
              <li>Hesap ekle → Gelişmiş → IMAP</li>
              <li>Gelen ve giden sunucuları Thunderbird ile aynı doldurun</li>
            </ol>
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
                <code>https://posta.lerta.com.tr</code> — TOTP ve passkey Ayarlar → Güvenlik.
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
        </>
      ) : null}
    </main>
  );
}
