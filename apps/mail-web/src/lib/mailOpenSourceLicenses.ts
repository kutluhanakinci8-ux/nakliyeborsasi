import { MAIL_WEB_W1_OPEN_SOURCE_LICENSES } from "./mailOpenSourceLicensesCatalog";
import { MAIL_WEB_W2_OPEN_SOURCE_LICENSES } from "./mailOpenSourceLicensesCatalogW2";
import { MAIL_WEB_W3_OPEN_SOURCE_LICENSES } from "./mailOpenSourceLicensesCatalogW3";
import { MAIL_WEB_W4_OPEN_SOURCE_LICENSES } from "./mailOpenSourceLicensesCatalogW4";
import { MAIL_WEB_W5_OPEN_SOURCE_LICENSES } from "./mailOpenSourceLicensesCatalogW5";
import { MAIL_WEB_W6_OPEN_SOURCE_LICENSES } from "./mailOpenSourceLicensesCatalogW6";
import type { OpenSourceLicenseEntry } from "./mailOpenSourceLicenseTypes";

export type { OpenSourceLicenseEntry } from "./mailOpenSourceLicenseTypes";

export const OPEN_SOURCE_LICENSES: OpenSourceLicenseEntry[] = [
  ...MAIL_WEB_W1_OPEN_SOURCE_LICENSES,
  ...MAIL_WEB_W2_OPEN_SOURCE_LICENSES,
  ...MAIL_WEB_W3_OPEN_SOURCE_LICENSES,
  ...MAIL_WEB_W4_OPEN_SOURCE_LICENSES,
  ...MAIL_WEB_W5_OPEN_SOURCE_LICENSES,
  ...MAIL_WEB_W6_OPEN_SOURCE_LICENSES,
];

/** apps/web istemcisi — Legal katalogda, posta bundle’ında yok. */
export const OSS_CATALOG_WEB_PACKAGE_NAMES = ["leaflet"] as const;

/** apps/mobile (ayrı package-lock) — verify mobile lockfile. */
export const OSS_CATALOG_MOBILE_PACKAGE_NAMES = [
  "expo",
  "react-native",
  "expo-auth-session",
] as const;

export function getOpenSourceLicenseById(
  id: string,
): OpenSourceLicenseEntry | undefined {
  return OPEN_SOURCE_LICENSES.find((entry) => entry.id === id);
}

export function listOpenSourceLicensesSorted(): OpenSourceLicenseEntry[] {
  return [...OPEN_SOURCE_LICENSES].sort((a, b) =>
    a.sortName.localeCompare(b.sortName, "tr"),
  );
}

/** SBOM doğrulama script'i ile senkron tutulur. */
export const OSS_CATALOG_REQUIRED_PACKAGE_NAMES = [
  "@fragaria/address-formatter",
  "next",
  "openpgp",
  "react",
  "@simplewebauthn/browser",
  "fzstd",
  "zstd-codec",
  "libphonenumber-js",
  "utf7",
  "isomorphic-dompurify",
  "dompurify",
] as const;

/** API sunucusu — Legal ekranında, tarayıcı bundle’ında yok. */
export const OSS_CATALOG_SERVER_PACKAGE_NAMES = [
  "web-push",
  "ws",
  "nodemailer",
  "@mongodb-js/zstd",
] as const;
