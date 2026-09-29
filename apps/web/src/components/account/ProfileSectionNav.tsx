"use client";

type ProfileSection = {
  id: string;
  label: string;
  ownerOnly?: boolean;
};

const PROFILE_SECTIONS: ProfileSection[] = [
  { id: "profile-identity", label: "Kimlik" },
  { id: "profile-locale", label: "Dil ve bölge" },
  { id: "profile-messaging-hub", label: "Mesajlar hub", ownerOnly: true },
  { id: "profile-notify", label: "Bildirimler" },
  { id: "profile-security", label: "Güvenlik" },
];

type Props = {
  showMessagingHub?: boolean;
};

export function ProfileSectionNav({ showMessagingHub = false }: Props) {
  const sections = PROFILE_SECTIONS.filter(
    (section) => !section.ownerOnly || showMessagingHub,
  );
  return (
    <nav className="account-profile-nav" aria-label="Profil bölümleri">
      <p className="account-profile-nav-title">Kişisel ayarlar</p>
      <ul className="account-profile-nav-list">
        {sections.map((section) => (
          <li key={section.id}>
            <a className="account-profile-nav-link" href={`#${section.id}`}>
              {section.label}
            </a>
          </li>
        ))}
      </ul>
      <div className="account-profile-nav-aside">
        <a className="account-profile-nav-link account-profile-nav-link--muted" href="/hesap/organizasyon">
          Kurumsal hesap
        </a>
        <a className="account-profile-nav-link account-profile-nav-link--muted" href="/hesap/odemeler">
          Ödemeler
        </a>
      </div>
    </nav>
  );
}
