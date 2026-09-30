"use client";

export type SocialHubTabId =
  | "connections"
  | "health"
  | "inbox"
  | "publishing"
  | "templates"
  | "analytics"
  | "team";

const TABS: { id: SocialHubTabId; label: string }[] = [
  { id: "connections", label: "Bağlı hesaplar" },
  { id: "health", label: "Sağlık & gönderim" },
  { id: "inbox", label: "Gelen kutusu" },
  { id: "publishing", label: "Yayınlar" },
  { id: "templates", label: "Şablonlar" },
  { id: "analytics", label: "İstatistikler" },
  { id: "team", label: "Ekip & izinler" },
];

type Props = {
  activeTab: SocialHubTabId;
  onTabChange: (tab: SocialHubTabId) => void;
};

export function SocialHubSectionNav({ activeTab, onTabChange }: Props) {
  return (
    <nav className="social-hub-tabs" aria-label="Sosyal medya bölümleri">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={
            activeTab === tab.id
              ? "social-hub-tab social-hub-tab--active"
              : "social-hub-tab"
          }
          aria-current={activeTab === tab.id ? "page" : undefined}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
