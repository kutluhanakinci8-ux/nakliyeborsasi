import { mitLicenseText } from "./ossLicenseTextBlocks";
import type { OpenSourceLicenseEntry } from "./mailOpenSourceLicenseTypes";

/** Web fazı W4 — posta sunucu bileşenleri (Legal’de, tarayıcı bundle’ında yok). */
export const MAIL_WEB_W4_OPEN_SOURCE_LICENSES: OpenSourceLicenseEntry[] = [
  {
    id: "nodemailer",
    sortName: "Nodemailer",
    packageName: "nodemailer",
    version: "10.0.10",
    copyright: "Copyright (c) Nodemailer contributors",
    licenseShort: "MIT-0",
    homepage: "https://nodemailer.com/",
    usageNoteKey: "ossLicenseNodemailerUsage",
    licenseText: mitLicenseText("Copyright (c) Nodemailer contributors (MIT-0)"),
  },
  {
    id: "zstd-node-api",
    sortName: "Zstandard (Node API)",
    packageName: "@mongodb-js/zstd",
    version: "7.0.0",
    copyright: "Copyright (c) MongoDB, Inc.",
    licenseShort: "Apache-2.0",
    homepage: "https://github.com/mongodb-js/zstd",
    usageNoteKey: "ossLicenseZstdNodeApiUsage",
    licenseText: `Apache License 2.0 — @mongodb-js/zstd

Copyright (c) MongoDB, Inc.

See https://www.apache.org/licenses/LICENSE-2.0 for the full license text.`,
  },
];
