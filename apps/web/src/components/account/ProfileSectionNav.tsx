"use client";

const PROFILE_SECTIONS = [
  { id: "profile-identity", label: "Kimlik" },
  { id: "profile-locale", label: "Dil ve bölge" },
  { id: "profile-notify", label: "Bildirimler" },
  { id: "profile-security", label: "Güvenlik" },
] as const;

export function ProfileSectionNav() {
  return (
    <nav className="account-profile-nav" aria-label="Profil bölümleri">
      <p className="account-profile-nav-title">Kişisel ayarlar</p>
      <ul className="account-profile-nav-list">
        {PROFILE_SECTIONS.map((section) => (
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
