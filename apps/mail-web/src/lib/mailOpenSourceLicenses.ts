import { MAIL_WEB_W1_OPEN_SOURCE_LICENSES } from "./mailOpenSourceLicensesCatalog";
import { MAIL_WEB_W2_OPEN_SOURCE_LICENSES } from "./mailOpenSourceLicensesCatalogW2";
import { MAIL_WEB_W3_OPEN_SOURCE_LICENSES } from "./mailOpenSourceLicensesCatalogW3";
import type { OpenSourceLicenseEntry } from "./mailOpenSourceLicenseTypes";

export type { OpenSourceLicenseEntry } from "./mailOpenSourceLicenseTypes";

export const OPEN_SOURCE_LICENSES: OpenSourceLicenseEntry[] = [
  ...MAIL_WEB_W1_OPEN_SOURCE_LICENSES,
  ...MAIL_WEB_W2_OPEN_SOURCE_LICENSES,
  ...MAIL_WEB_W3_OPEN_SOURCE_LICENSES,
];

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
export const OSS_CATALOG_SERVER_PACKAGE_NAMES = ["web-push", "ws"] as const;
