/**
 * WinLRT / bağımsız istemci indirmeleri — posta/mesaj API’sine bağlı değil.
 * Sürüm: `winlrtReleaseMeta.ts` (W5 tek kaynak).
 */

import { WINLRT_RELEASE, winlrtDownloadHref } from "./winlrtReleaseMeta";

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
    description: `.ltr açın, Author v1 ile oluşturun, yazdırın. Sürüm ${WINLRT_RELEASE.version}.`,
    platform: "windows",
    phase: "W1",
    available: true,
    href: winlrtDownloadHref("msi"),
  },
  {
    id: "winlrt-macos",
    name: "WinLRT for Mac",
    description: `Apple Silicon DMG · sürüm ${WINLRT_RELEASE.version}. UTType com.lerta.document.ltr.`,
    platform: "macos",
    phase: "W2",
    available: true,
    href: winlrtDownloadHref("macosDmg"),
  },
  {
    id: "winlrt-android",
    name: "WinLRT — Google Play",
    description:
      "Android (com.lerta.winlrt): .ltr açma, paylaşım ve Author v1. Play linki yayınlandığında aktif olur.",
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
      "iPhone / iPad: Dosyalar’dan .ltr ve Author v1. TestFlight / App Store sonrası aktif olur.",
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
    id: "template-teklif",
    name: "Şablon — Taşıma teklifi",
    description: "Author v1 boş teklif şablonu; WinLRT ile düzenleyip kaydedin.",
    platform: "sample",
    phase: "W5",
    available: true,
    href: "/downloads/samples/sablon-teklif.ltr",
  },
  {
    id: "template-kapasite",
    name: "Şablon — Kapasite bildirimi",
    description: "Boş kapasite / tonaj özeti şablonu.",
    platform: "sample",
    phase: "W5",
    available: true,
    href: "/downloads/samples/sablon-kapasite.ltr",
  },
  {
    id: "template-rota",
    name: "Şablon — Rota özeti",
    description: "Durak ve mesafe özeti şablonu.",
    platform: "sample",
    phase: "W5",
    available: true,
    href: "/downloads/samples/sablon-rota.ltr",
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
    "WinLRT, LTR (.ltr) belgeleri için indirilebilir istemcidir. Author v1 ile lojistik şablonlarından belge oluşturabilirsiniz. Posta ve mesajlaşmadan bağımsızdır.",
} as const;

export { WINLRT_RELEASE };
