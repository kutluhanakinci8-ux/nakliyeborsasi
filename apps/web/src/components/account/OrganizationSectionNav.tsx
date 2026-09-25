"use client";

const ORG_SECTIONS = [
  { id: "org-ozet", label: "Kurumsal özet" },
  { id: "org-dogrulama", label: "Doğrulama" },
  { id: "org-temel", label: "Temel bilgiler" },
  { id: "org-web", label: "Web kaynağı" },
  { id: "org-koridor", label: "Koridorlar" },
  { id: "org-iletisim", label: "İletişim" },
  { id: "org-eposta", label: "E-posta kimliği" },
  { id: "org-gelen-kutusu", label: "Gelen kutusu" },
  { id: "org-abonelik", label: "Abonelik" },
] as const;

export function OrganizationSectionNav() {
  return (
    <nav className="account-org-nav" aria-label="Organizasyon bölümleri">
      <p className="account-org-nav-title">Firma yönetimi</p>
      <ul className="account-org-nav-list">
        {ORG_SECTIONS.map((section) => (
          <li key={section.id}>
            <a className="account-org-nav-link" href={`#${section.id}`}>
              {section.label}
            </a>
          </li>
        ))}
      </ul>
      <div className="account-org-nav-aside">
        <a className="account-org-nav-link account-org-nav-link--muted" href="/hesap/calisanlar">
          Çalışanlar
        </a>
        <a className="account-org-nav-link account-org-nav-link--muted" href="/hesap/odemeler">
          Ödemeler
        </a>
      </div>
    </nav>
  );
}
