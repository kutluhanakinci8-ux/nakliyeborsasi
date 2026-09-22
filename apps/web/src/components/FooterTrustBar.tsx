import Image from "next/image";

const APP_STORE_URL = "https://apps.apple.com/app/nakliye-borsasi";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.nakliyeborsasi.app";

const STORE_BADGES = {
  appStore: {
    src: "/footer/app-store.svg",
    width: 135,
    height: 40,
    alt: "Download on the App Store",
  },
  googlePlay: {
    src: "/footer/google-play.svg",
    width: 155,
    height: 60,
    alt: "Get it on Google Play",
  },
} as const;

const PAYMENT_MARKS = [
  { src: "/footer/mastercard.svg", width: 72, height: 32, alt: "Mastercard" },
  {
    src: "/footer/mastercard-securecode.svg",
    width: 128,
    height: 32,
    alt: "Mastercard SecureCode",
  },
  { src: "/footer/visa.svg", width: 72, height: 24, alt: "Visa" },
] as const;

export function FooterStoreBadges() {
  return (
    <div className="site-footer-apps" aria-label="Mobil uygulama">
      <a
        className="store-badge"
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={STORE_BADGES.appStore.alt}
      >
        <Image
          src={STORE_BADGES.appStore.src}
          alt={STORE_BADGES.appStore.alt}
          width={STORE_BADGES.appStore.width}
          height={STORE_BADGES.appStore.height}
          className="store-badge-img"
        />
      </a>
      <a
        className="store-badge"
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={STORE_BADGES.googlePlay.alt}
      >
        <Image
          src={STORE_BADGES.googlePlay.src}
          alt={STORE_BADGES.googlePlay.alt}
          width={STORE_BADGES.googlePlay.width}
          height={STORE_BADGES.googlePlay.height}
          className="store-badge-img store-badge-img--play"
        />
      </a>
    </div>
  );
}

export function FooterPaymentMarks() {
  return (
    <div
      className="site-footer-payments"
      aria-label="Ödeme ve güvenlik iş ortakları"
    >
      {PAYMENT_MARKS.map((mark) => (
        <span className="payment-mark" key={mark.src} title={mark.alt}>
          <Image
            src={mark.src}
            alt={mark.alt}
            width={mark.width}
            height={mark.height}
            className="payment-mark-img payment-mark-img--mono"
          />
        </span>
      ))}
    </div>
  );
}
