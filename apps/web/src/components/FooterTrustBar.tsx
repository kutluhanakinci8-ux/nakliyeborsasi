const APP_STORE_URL = "https://apps.apple.com/app/nakliye-borsasi";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.nakliyeborsasi.app";

export function FooterTrustBar() {
  return (
    <div className="site-footer-bottom">
      <div className="site-footer-bottom-inner">
        <div className="site-footer-apps" aria-label="Mobil uygulama">
          <a
            className="store-badge"
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="App Store'dan indir"
          >
            <AppStoreBadge />
          </a>
          <a
            className="store-badge"
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Google Play'den indir"
          >
            <GooglePlayBadge />
          </a>
        </div>
        <div className="site-footer-bottom-rule" aria-hidden />
        <div
          className="site-footer-payments"
          aria-label="Ödeme ve güvenlik iş ortakları"
        >
          <span className="payment-mark payment-mark--mastercard" title="Mastercard">
            <MastercardMark />
          </span>
          <span className="payment-mark payment-mark--securecode" title="Mastercard SecureCode">
            <SecureCodeMark />
          </span>
          <span className="payment-mark payment-mark--visa" title="Visa">
            <VisaMark />
          </span>
        </div>
      </div>
    </div>
  );
}

function AppStoreBadge() {
  return (
    <svg viewBox="0 0 180 54" role="img" aria-hidden>
      <rect width="180" height="54" rx="8" fill="#000" />
      <path
        fill="#fff"
        d="M34.2 27.1c-.03-3.2 2.6-4.7 2.72-4.78-1.48-2.16-3.78-2.46-4.6-2.5-1.96-.2-3.84 1.16-4.84 1.16-1.02 0-2.58-1.13-4.24-1.1-2.18.03-4.2 1.27-5.32 3.22-2.28 3.95-.58 9.8 1.62 13.02 1.08 1.56 2.36 3.32 4.04 3.26 1.62-.07 2.24-1.05 4.2-1.05 1.96 0 2.5 1.05 4.22 1.02 1.74-.03 2.84-1.58 3.9-3.15 1.22-1.78 1.72-3.5 1.75-3.58-.04-.02-3.36-1.29-3.39-5.1zm-3.2-9.38c.9-1.08 1.5-2.58 1.34-4.08-1.3.05-2.86.87-3.78 1.94-.83.96-1.56 2.5-1.36 3.98 1.44.11 2.9-.73 3.8-1.84z"
      />
      <text
        x="52"
        y="18"
        fill="#fff"
        fontSize="8"
        fontFamily="system-ui, sans-serif"
      >
        Download on the
      </text>
      <text
        x="52"
        y="34"
        fill="#fff"
        fontSize="14"
        fontWeight="600"
        fontFamily="system-ui, sans-serif"
      >
        App Store
      </text>
    </svg>
  );
}

function GooglePlayBadge() {
  return (
    <svg viewBox="0 0 180 54" role="img" aria-hidden>
      <rect width="180" height="54" rx="8" fill="#000" />
      <path fill="#00D2FF" d="M22 12.5l12.5 14.5L22 41.5z" />
      <path fill="#00F076" d="M22 12.5l20 8.5-7.5 6-12.5-14.5z" />
      <path fill="#FF3A44" d="M42 21l7.5 6-7.5 6-20-8.5 20-3.5z" />
      <path fill="#FFB900" d="M22 41.5l12.5-14.5L42 33l-20 8.5z" />
      <text
        x="58"
        y="18"
        fill="#fff"
        fontSize="7.5"
        fontFamily="system-ui, sans-serif"
      >
        GET IT ON
      </text>
      <text
        x="58"
        y="34"
        fill="#fff"
        fontSize="13"
        fontWeight="600"
        fontFamily="system-ui, sans-serif"
      >
        Google Play
      </text>
    </svg>
  );
}

function MastercardMark() {
  return (
    <svg viewBox="0 0 72 44" role="img" aria-hidden>
      <circle cx="28" cy="22" r="14" fill="currentColor" opacity="0.9" />
      <circle cx="44" cy="22" r="14" fill="currentColor" opacity="0.55" />
      <text
        x="36"
        y="42"
        textAnchor="middle"
        fill="currentColor"
        fontSize="7"
        fontFamily="system-ui, sans-serif"
        fontWeight="600"
      >
        mastercard
      </text>
    </svg>
  );
}

function SecureCodeMark() {
  return (
    <svg viewBox="0 0 120 44" role="img" aria-hidden>
      <circle cx="14" cy="16" r="8" fill="currentColor" opacity="0.85" />
      <circle cx="24" cy="16" r="8" fill="currentColor" opacity="0.5" />
      <text
        x="38"
        y="14"
        fill="currentColor"
        fontSize="7"
        fontFamily="system-ui, sans-serif"
        fontWeight="700"
      >
        MasterCard
      </text>
      <text
        x="38"
        y="24"
        fill="currentColor"
        fontSize="7"
        fontFamily="system-ui, sans-serif"
        fontWeight="600"
      >
        SecureCode
      </text>
    </svg>
  );
}

function VisaMark() {
  return (
    <svg viewBox="0 0 72 44" role="img" aria-hidden>
      <text
        x="36"
        y="28"
        textAnchor="middle"
        fill="currentColor"
        fontSize="22"
        fontFamily="system-ui, sans-serif"
        fontWeight="800"
        fontStyle="italic"
        letterSpacing="-1"
      >
        VISA
      </text>
    </svg>
  );
}
