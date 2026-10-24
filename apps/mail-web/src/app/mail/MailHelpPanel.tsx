"use client";

import type { SettingsView } from "./MailSettingsPanel";

type Props = {
  onOpenSetting: (view: SettingsView) => void;
  onOpenCalendar?: () => void;
  onOpenContacts?: () => void;
};

type HelpTopic = {
  id: string;
  icon: string;
  title: string;
  description: string;
  settingView?: SettingsView;
  guideHref?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function MailHelpPanel({
  onOpenSetting,
  onOpenCalendar,
  onOpenContacts,
}: Props) {
  const topics: HelpTopic[] = [
    {
      id: "start",
      icon: "✉️",
      title: "Posta ve yazma",
      description:
        "Gelen kutusu, konuşma görünümü, geri alma, yanıt davranışı ve uzak resimler — Ayarlar → Posta ve Ekran.",
      settingView: "mailPrefs",
      actionLabel: "Posta ayarları",
    },
    {
      id: "accounts",
      icon: "👤",
      title: "Hesaplar ve gönderenler",
      description:
        "Kurumsal adres, alias ve varsayılan Gönderen kimliği; sosyal bağlantılar konsoldan yönetilir.",
      settingView: "accounts",
      actionLabel: "Hesaplar",
    },
    {
      id: "signature",
      icon: "✒️",
      title: "İmza ve şablonlar",
      description:
        "Kişisel imza, nakliye hazır şablonları ve kampanya metinleri yaz ekranından seçilir.",
      settingView: "signature",
      actionLabel: "İmza ve şablon",
    },
    {
      id: "rules",
      icon: "⚡",
      title: "Posta kuralları",
      description:
        "Gelen postayı otomatik yıldızla, arşivle, klasöre taşı veya çöpe gönder; önizleme ve toplu uygulama.",
      settingView: "rules",
      actionLabel: "Kurallar",
    },
    {
      id: "autoreply",
      icon: "↩️",
      title: "Otomatik yanıtlar",
      description: "Tatil veya toplantı mesajı; isteğe bağlı başlangıç/bitiş tarihi.",
      settingView: "autoReply",
      actionLabel: "Otomatik yanıt",
    },
    {
      id: "notify",
      icon: "🔔",
      title: "Bildirimler ve PWA",
      description:
        "Web Push, sekme açıkken ses, günlük özet. iPhone için Ana ekrana ekle adımları bildirimler sekmesinde.",
      settingView: "notifications",
      actionLabel: "Bildirimler",
    },
    {
      id: "imap",
      icon: "📬",
      title: "IMAP ve SMTP",
      description:
        "Thunderbird, Outlook ve mobil istemci: sunucu bilgileri ve tek seferlik IMAP şifresi webmailden alınır.",
      settingView: "imap",
      guideHref: "/help/imap",
      actionLabel: "IMAP ayarları",
    },
    {
      id: "deliverability",
      icon: "📈",
      title: "Teslimat ve itibar",
      description: "DNS sihirbazı (MX, SPF, DKIM, DMARC, BIMI), skor ve engagement özeti.",
      settingView: "deliverability",
      actionLabel: "Teslimat",
    },
    {
      id: "calendar",
      icon: "📅",
      title: "Takvim ve CalDAV",
      description: "Harici takvim hesapları, ICS akışları ve senkron — takvim modülü ile entegre.",
      actionLabel: "Takvimi aç",
      onAction: onOpenCalendar,
    },
    {
      id: "contacts",
      icon: "👥",
      title: "Kişiler ve CardDAV",
      description: "Rehber, VCF içe/dışa aktarma ve CardDAV senkron.",
      actionLabel: "Kişileri aç",
      onAction: onOpenContacts,
    },
    {
      id: "security",
      icon: "🔒",
      title: "Güvenlik ve gizlilik",
      description: "İki adımlı doğrulama (TOTP), KVKK veri export ve AI posta onayı.",
      settingView: "security",
      actionLabel: "Güvenlik",
    },
    {
      id: "privacy",
      icon: "🛡️",
      title: "KVKK ve veri hakları",
      description: "Kişisel veri export talebi ve gizlilik tercihleri.",
      settingView: "privacy",
      actionLabel: "Gizlilik",
    },
    {
      id: "ops",
      icon: "📋",
      title: "Ops ve runbook",
      description: "Kurumsal snapshot, teslimat metrikleri ve doğrulama script referansları.",
      settingView: "ops",
      actionLabel: "Ops snapshot",
    },
  ];

  return (
    <div className="mail-help-panel mail-help-panel--premium">
      <p className="mail-posta-intro">
        Lerta Posta yardım merkezi: webmail özellikleri, harici istemci kurulumu ve
        kurumsal ayarlara doğrudan geçiş. Tam IMAP rehberi ayrı sayfada da
        açılabilir.
      </p>

      <section className="mail-posta-card mail-help-quick-card">
        <header className="mail-posta-card-head">
          <h3 className="mail-posta-card-title">Hızlı erişim</h3>
          <p className="mail-posta-card-desc">
            En sık kullanılan ayarlar ve rehberler.
          </p>
        </header>
        <div className="mail-help-quick-grid">
          <button
            type="button"
            className="mail-help-quick-btn"
            onClick={() => onOpenSetting("imap")}
          >
            <span aria-hidden="true">📬</span>
            IMAP kurulum
          </button>
          <button
            type="button"
            className="mail-help-quick-btn"
            onClick={() => onOpenSetting("notifications")}
          >
            <span aria-hidden="true">🔔</span>
            Bildirimler
          </button>
          <button
            type="button"
            className="mail-help-quick-btn"
            onClick={() => window.open("/help/imap", "_blank", "noopener,noreferrer")}
          >
            <span aria-hidden="true">📖</span>
            Tam IMAP rehberi
          </button>
        </div>
      </section>

      <ul className="mail-help-topic-list">
        {topics.map((topic) => (
          <li key={topic.id} className="mail-posta-card mail-help-topic-card">
            <div className="mail-help-topic-icon" aria-hidden="true">{topic.icon}</div>
            <div className="mail-help-topic-body">
              <h3 className="mail-help-topic-title">{topic.title}</h3>
              <p className="mail-help-topic-desc">{topic.description}</p>
              <div className="mail-help-topic-actions">
                {topic.settingView ? (
                  <button
                    type="button"
                    className="mail-premium-btn mail-premium-btn--primary"
                    onClick={() => onOpenSetting(topic.settingView!)}
                  >
                    {topic.actionLabel ?? "Ayarlara git"}
                  </button>
                ) : null}
                {topic.onAction ? (
                  <button
                    type="button"
                    className="mail-premium-btn mail-premium-btn--primary"
                    onClick={() => topic.onAction?.()}
                  >
                    {topic.actionLabel ?? "Aç"}
                  </button>
                ) : null}
                {topic.guideHref ? (
                  <a
                    className="mail-premium-btn mail-premium-btn--ghost"
                    href={topic.guideHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Tam rehber
                  </a>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <section className="mail-posta-card mail-posta-card--muted mail-help-footer-card">
        <p className="mail-help-footer-text">
          Site adresi:{" "}
          <a href="https://posta.lerta.com.tr/mail" target="_blank" rel="noreferrer">
            posta.lerta.com.tr
          </a>
          . Sorun devam ederse posta yöneticinize veya Lerta destek kanalına başvurun.
        </p>
      </section>
    </div>
  );
}
