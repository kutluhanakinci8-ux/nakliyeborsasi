import { mitLicenseText } from "./ossLicenseTextBlocks";
import type { OpenSourceLicenseEntry } from "./mailOpenSourceLicenseTypes";

/** Web fazı W2 — Gmail listesi karşılığı (jutf7, libPhoneNumber, Brotli). */
export const MAIL_WEB_W2_OPEN_SOURCE_LICENSES: OpenSourceLicenseEntry[] = [
  {
    id: "brotli",
    sortName: "Brotli",
    packageName: "Brotli (Node.js zlib.brotliCompress)",
    version: "Node.js built-in",
    copyright: "Copyright (c) The Brotli Authors",
    licenseShort: "MIT",
    homepage: "https://github.com/google/brotli",
    usageNoteKey: "ossLicenseBrotliUsage",
    licenseText: mitLicenseText("Copyright (c) The Brotli Authors"),
  },
  {
    id: "libphonenumber-js",
    sortName: "libphonenumber-js",
    packageName: "libphonenumber-js",
    version: "1.13.13",
    copyright: "Copyright (c) libphonenumber-js contributors",
    licenseShort: "MIT",
    homepage: "https://gitlab.com/catamphetamine/libphonenumber-js",
    usageNoteKey: "ossLicenseLibPhoneNumberUsage",
    licenseText: mitLicenseText("Copyright (c) libphonenumber-js contributors"),
  },
  {
    id: "utf7-imap",
    sortName: "UTF-7 (IMAP)",
    packageName: "utf7 (jutf7 / RFC 3501 modified UTF-7)",
    version: "1.0.2",
    copyright: "Copyright (c) Konstantin Käfer",
    licenseShort: "BSD",
    homepage: "https://github.com/kkaefer/node-utf7",
    usageNoteKey: "ossLicenseUtf7ImapUsage",
    licenseText: `Copyright (c) Konstantin Käfer

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.
3. Neither the name of the copyright holder nor the names of its contributors
   may be used to endorse or promote products derived from this software without
   specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED.`,
  },
];
