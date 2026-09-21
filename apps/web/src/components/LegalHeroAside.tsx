type LegalHeroAsideProps = {
  versionLabel: string;
  updatedLabel: string;
  jurisdiction: string;
};

export function LegalHeroAside({
  versionLabel,
  updatedLabel,
  jurisdiction,
}: LegalHeroAsideProps) {
  return (
    <div className="legal-hero-aside" aria-hidden={false}>
      <div className="legal-hero-doc">
        <div className="legal-hero-doc-icon">
          <svg viewBox="0 0 64 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="4" width="48" height="72" rx="8" fill="#fff" stroke="#6ee7b7" strokeWidth="2" />
            <path d="M20 22h24M20 32h24M20 42h16" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="48" cy="56" r="14" fill="#ecfdf5" stroke="#10b981" strokeWidth="2" />
            <path
              d="M42 56l4 4 8-10"
              stroke="#047857"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="legal-hero-doc-caption">Platform sözleşmesi özeti</p>
      </div>
      <ul className="legal-hero-meta">
        <li>
          <span className="legal-hero-meta-label">Sürüm</span>
          <span className="legal-hero-meta-value">{versionLabel}</span>
        </li>
        <li>
          <span className="legal-hero-meta-label">Son güncelleme</span>
          <span className="legal-hero-meta-value">{updatedLabel}</span>
        </li>
        <li>
          <span className="legal-hero-meta-label">Uygulanacak hukuk</span>
          <span className="legal-hero-meta-value">{jurisdiction}</span>
        </li>
      </ul>
    </div>
  );
}
