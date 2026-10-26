export const MAIL_WEB_I18N_OSS_LICENSES_TR = {
  settingsHubOssLicenses: "Lisanslar",
  settingsHubOssLicensesSub: "Açık kaynak bileşenler",
  ossLicensesTitle: "Açık kaynak lisansları",
  ossLicensesIntro:
    "Lerta Posta web istemcisi aşağıdaki açık kaynak bileşenleri kullanır (W1 kataloğu). Bir satıra dokunarak tam lisans metnini görüntüleyin.",
  ossLicensesBackToList: "Lisans listesi",
  ossLicensePackage: "Paket",
  ossLicenseVersion: "Sürüm",
  ossLicenseCopyright: "Telif",
  ossLicenseShort: "Lisans",
  ossLicenseHomepage: "Kaynak",
  helpOpenSourceLicenses: "Lisanslar",
  ossLicenseZstandardUsage:
    "Zstandard; birincil sıkıştırma — Posta API JSON (X-Lerta-Encoding: zstd), IndexedDB çevrimdışı önbellek ve mesaj detayları.",
  ossLicenseAddressFormattingUsage:
    "Address formatting (OpenCage); kurumsal posta adresi, giden e-posta dipnotu ve yol tarifi sorgularında uluslararası kısaltma ve satır düzeni.",
  ossLicenseZlibUsage:
    "zlib (gzip/DEFLATE); Zstd desteklemeyen istemciler için API yedek sıkıştırma (X-Lerta-Encoding: gzip), eDiscovery ZIP arşivleri ve ZIP CRC hesapları.",
  ossLicenseReactUsage:
    "React ve react-dom; posta arayüzü, ayarlar, gelen kutusu ve yazma ekranı bileşenleri.",
  ossLicenseNextUsage:
    "Next.js; web istemcisi çatısı, sayfa yönlendirme ve üretim derlemesi (@next/swc dahil).",
  ossLicenseOpenpgpUsage:
    "OpenPGP.js; istemci tarafında PGP şifreleme ve anahtar okuma (kurumsal güvenli posta).",
  ossLicenseSimpleWebAuthnUsage:
    "SimpleWebAuthn; passkey ve biyometrik giriş (WebAuthn) tarayıcı istemcisi.",
} as const;

export const MAIL_WEB_I18N_OSS_LICENSES_EN = {
  settingsHubOssLicenses: "Licenses",
  settingsHubOssLicensesSub: "Open-source components",
  ossLicensesTitle: "Open source licenses",
  ossLicensesIntro:
    "The Lerta Posta web client uses the open-source components below (W1 catalog). Tap a row to view the full license text.",
  ossLicensesBackToList: "License list",
  ossLicensePackage: "Package",
  ossLicenseVersion: "Version",
  ossLicenseCopyright: "Copyright",
  ossLicenseShort: "License",
  ossLicenseHomepage: "Source",
  helpOpenSourceLicenses: "Licenses",
  ossLicenseZstandardUsage:
    "Zstandard is the primary codec for Posta API JSON (X-Lerta-Encoding: zstd) and compressed IndexedDB offline cache.",
  ossLicenseAddressFormattingUsage:
    "Address formatting (OpenCage); corporate postal address, outbound footer, and directions queries with international abbreviations.",
  ossLicenseZlibUsage:
    "zlib (gzip/DEFLATE) provides API fallback compression (X-Lerta-Encoding: gzip), eDiscovery ZIP exports, and ZIP CRC checks.",
  ossLicenseReactUsage:
    "React and react-dom power the mail UI, settings, inbox, and compose surfaces.",
  ossLicenseNextUsage:
    "Next.js is the web client framework (routing, production build, @next/swc).",
  ossLicenseOpenpgpUsage:
    "OpenPGP.js provides client-side PGP encryption and key handling.",
  ossLicenseSimpleWebAuthnUsage:
    "SimpleWebAuthn enables passkeys and biometric sign-in in the browser.",
} as const;
