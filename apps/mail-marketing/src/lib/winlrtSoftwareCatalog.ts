/**
 * WinLRT / bağımsız istemci indirmeleri — posta/mesaj API’sine bağlı değil.
 * Durum güncellemesi: deploy sonrası `available` ve `href` alanları.
 */

export type SoftwareDownloadPlatform =
  | "windows"
  | "macos"
  | "android"
  | "ios"
  | "web"
  | "sample";

export type SoftwareDownloadItem = {
  id: string;
  name: string;
  description: string;
  platform: SoftwareDownloadPlatform;
  /** W fazı (WINLRT_PRODUCT_ROADMAP) */
  phase: string;
  available: boolean;
  href: string;
  /** external store */
  external?: boolean;
};

export const WINLRT_SOFTWARE_CATALOG: SoftwareDownloadItem[] = [
  {
    id: "winlrt-windows",
    name: "WinLRT for Windows",
    description: ".ltr belgelerini açın, yazdırın ve PDF’e aktarın. Kurulumda dosya ilişkilendirme.",
    platform: "windows",
    phase: "W1",
    available: true,
    href: "/downloads/winlrt/WinLRT_0.1.0_x64_en-US.msi",
  },
  {
    id: "winlrt-macos",
    name: "WinLRT for Mac",
    description: "macOS (Apple Silicon) DMG; .ltr UTType com.lerta.document.ltr. Gatekeeper uyarısı: imzasız beta.",
    platform: "macos",
    phase: "W2",
    available: true,
    href: "/downloads/winlrt/WinLRT_0.1.0_aarch64.dmg",
  },
  {
    id: "winlrt-android",
    name: "WinLRT — Google Play",
    description:
      "Android (com.lerta.winlrt): .ltr açma ve paylaşım. Play internal test — mağaza linki yayınlandığında aktif olur.",
    platform: "android",
    phase: "W3",
    available: false,
    href: "https://play.google.com/store/apps/details?id=com.lerta.winlrt",
    external: true,
  },
  {
    id: "winlrt-ios",
    name: "WinLRT — App Store",
    description:
      "iPhone / iPad (com.lerta.winlrt): Dosyalar’dan .ltr açma. TestFlight / App Store linki yayınlandığında aktif olur.",
    platform: "ios",
    phase: "W4",
    available: false,
    href: "https://apps.apple.com/tr/search?term=WinLRT+Lerta",
    external: true,
  },
  {
    id: "sample-ltr",
    name: "Örnek teklif (.ltr)",
    description: "Mühürlü örnek belge — WinLRT veya tarayıcı önizlemesi ile deneyin.",
    platform: "sample",
    phase: "W0",
    available: true,
    href: "/downloads/samples/ornek-teklif.ltr",
  },
  {
    id: "web-preview",
    name: "Tarayıcı önizlemesi (geçici)",
    description: "WinLRT kurmadan .ltr yükleyip görüntüleyin. WinLRT yayına kadar geçici.",
    platform: "web",
    phase: "W0",
    available: true,
    href: "/destek/yazilim-indir/onizleme",
  },
];

export const SOFTWARE_DOWNLOAD_PAGE = {
  path: "/destek/yazilim-indir",
  title: "Yazılım indir",
  lead:
    "WinLRT, LTR (.ltr) belgeleri için indirilebilir istemcidir. Posta ve mesajlaşmadan bağımsız çalışır; kurulum sonrası çift tıkla açılır.",
} as const;
