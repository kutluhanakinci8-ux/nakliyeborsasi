import { mitLicenseText } from "./ossLicenseTextBlocks";
import type { OpenSourceLicenseEntry } from "./mailOpenSourceLicenseTypes";

/** Web fazı W3 — güvenli HTML + mesajlaşma altyapısı (posta Legal’de sunucu notu ile). */
export const MAIL_WEB_W3_OPEN_SOURCE_LICENSES: OpenSourceLicenseEntry[] = [
  {
    id: "dompurify",
    sortName: "DOMPurify",
    packageName: "dompurify · isomorphic-dompurify",
    version: "3.2.6 · 2.22.0",
    copyright: "Copyright (c) Dr.-Ing. Mario Heiderich, Cure53",
    licenseShort: "MPL-2.0 OR Apache-2.0",
    homepage: "https://github.com/cure53/DOMPurify",
    usageNoteKey: "ossLicenseDompurifyUsage",
    licenseText: mitLicenseText(
      "Copyright (c) Dr.-Ing. Mario Heiderich, Cure53 — see package for MPL-2.0 OR Apache-2.0 full text",
    ),
  },
  {
    id: "web-push",
    sortName: "web-push",
    packageName: "web-push",
    version: "3.6.7",
    copyright: "Copyright (c) web-push contributors",
    licenseShort: "MPL-2.0",
    homepage: "https://github.com/web-push-libs/web-push",
    usageNoteKey: "ossLicenseWebPushUsage",
    licenseText: `Mozilla Public License Version 2.0

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
If a copy of the MPL was not distributed with this file, You can obtain one at
https://mozilla.org/MPL/2.0/.

Copyright (c) web-push contributors. Full license text ships with the npm package.`,
  },
  {
    id: "ws",
    sortName: "ws",
    packageName: "ws",
    version: "8.22.0",
    copyright: "Copyright (c) 2011–2024 Einar Otto Stangvik and ws contributors",
    licenseShort: "MIT",
    homepage: "https://github.com/websockets/ws",
    usageNoteKey: "ossLicenseWsUsage",
    licenseText: mitLicenseText(
      "Copyright (c) 2011–2024 Einar Otto Stangvik and ws contributors",
    ),
  },
];
