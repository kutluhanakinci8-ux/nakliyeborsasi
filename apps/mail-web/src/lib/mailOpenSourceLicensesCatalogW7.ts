import type { OpenSourceLicenseEntry } from "./mailOpenSourceLicenseTypes";

/** Faz W7 — posta ek görsel önizleme (API, libvips/sharp). */
export const MAIL_WEB_W7_OPEN_SOURCE_LICENSES: OpenSourceLicenseEntry[] = [
  {
    id: "sharp",
    sortName: "sharp (libvips)",
    packageName: "sharp",
    version: "0.35.5",
    copyright:
      "Copyright (c) Lovell Fuller and contributors; libvips and bundled codecs (libjpeg-turbo, etc.)",
    licenseShort: "Apache-2.0",
    homepage: "https://sharp.pixelplumbing.com/",
    usageNoteKey: "ossLicenseSharpUsage",
    licenseText: `Apache License 2.0 — sharp

Copyright (c) Lovell Fuller and contributors.

sharp links to libvips and native image codecs (including libjpeg-turbo). See the npm package and
https://www.apache.org/licenses/LICENSE-2.0 for the full license text.`,
  },
];
