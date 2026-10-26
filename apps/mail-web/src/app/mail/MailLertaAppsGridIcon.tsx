/** Outlook-style 2×2 app grid mark for settings rows. */
export function MailLertaAppsGridIcon() {
  return (
    <svg
      className="mail-lerta-apps-grid-icon"
      width={22}
      height={22}
      viewBox="0 0 22 22"
      aria-hidden
      focusable="false"
    >
      <rect x="1" y="1" width="9" height="9" rx="1.5" fill="var(--mail-brand)" />
      <rect x="12" y="1" width="9" height="9" rx="1.5" fill="var(--mail-brand-mid)" />
      <rect x="1" y="12" width="9" height="9" rx="1.5" fill="#2d6a9f" />
      <rect x="12" y="12" width="9" height="9" rx="1.5" fill="var(--mail-brand-ink)" />
    </svg>
  );
}
