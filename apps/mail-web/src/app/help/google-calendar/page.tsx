import Link from "next/link";

export const metadata = {
  title: "Yardım — Google Takvim | Lerta Posta",
  description: "Google Calendar OAuth ve iki yön senkron kurulumu",
};

export default function GoogleCalendarHelpPage() {
  return (
    <main className="mail-help-page mail-help-page--premium">
      <p className="mail-help-back">
        <Link href="/mail">← Webmail</Link>
      </p>
      <header className="mail-help-hero">
        <h1>Google Takvim bağlantısı</h1>
        <p className="mail-help-hero-lead">
          Webmail takvimi Google Calendar ile <strong>iki yön</strong> senkron
          eder. Bağlantı OAuth 2.0 ile yapılır; kullanıcı Takvim görünümünden
          veya Ayarlar → Takvim ekranından hesap ekleyebilir.
        </p>
      </header>
      <section className="mail-help-section">
        <h2>Yönetici — sunucu ortamı</h2>
        <ul>
          <li>
            <code>GOOGLE_CALENDAR_CLIENT_ID</code>
          </li>
          <li>
            <code>GOOGLE_CALENDAR_CLIENT_SECRET</code>
          </li>
          <li>
            <code>GOOGLE_CALENDAR_REDIRECT_URI</code> →{" "}
            <code>https://posta.lerta.com.tr/mail/google-calendar-oauth</code>
          </li>
        </ul>
        <p>
          Google Cloud Console: Calendar API etkin, OAuth istemci redirect URI ve
          scope <code>https://www.googleapis.com/auth/calendar</code>.
        </p>
      </section>
      <section className="mail-help-section">
        <h2>Kullanıcı adımları</h2>
        <ol>
          <li>Webmail → <strong>Takvim</strong> → Google Takvim bölümü</li>
          <li>
            <strong>Google hesabı bağla</strong> (veya Ayarlar → Takvim)
          </li>
          <li>Google oturumunu onaylayın; pencere kapanınca senkron başlar</li>
        </ol>
      </section>
      <p className="mail-help-muted">
        Microsoft Outlook için Graph takvim kartı aynı düzende Takvim ekranında
        listelenir.
      </p>
    </main>
  );
}
