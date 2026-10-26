import {
  mitLicenseText,
  OPENPGP_LGPL3_LICENSE_TEXT,
} from "./ossLicenseTextBlocks";
import type { OpenSourceLicenseEntry } from "./mailOpenSourceLicenseTypes";

/** Web fazı W1 — Posta istemcisinde kullanıcıya dağıtılan bileşenler. */
export const MAIL_WEB_W1_OPEN_SOURCE_LICENSES: OpenSourceLicenseEntry[] = [
  {
    id: "nextjs",
    sortName: "Next.js",
    packageName: "next",
    version: "15.5.28",
    copyright: "Copyright (c) 2025 Vercel, Inc.",
    licenseShort: "MIT",
    homepage: "https://nextjs.org/",
    usageNoteKey: "ossLicenseNextUsage",
    licenseText: mitLicenseText("Copyright (c) 2025 Vercel, Inc."),
  },
  {
    id: "openpgp",
    sortName: "OpenPGP.js",
    packageName: "openpgp",
    version: "5.11.3",
    copyright: "OpenPGP.js contributors (see openpgpjs.org)",
    licenseShort: "LGPL-3.0+",
    homepage: "https://openpgpjs.org/",
    usageNoteKey: "ossLicenseOpenpgpUsage",
    licenseText: OPENPGP_LGPL3_LICENSE_TEXT,
  },
  {
    id: "react",
    sortName: "React",
    packageName: "react · react-dom",
    version: "18.3.1",
    copyright: "Copyright (c) Meta Platforms, Inc. and affiliates.",
    licenseShort: "MIT",
    homepage: "https://react.dev/",
    usageNoteKey: "ossLicenseReactUsage",
    licenseText: mitLicenseText(
      "Copyright (c) Meta Platforms, Inc. and affiliates.",
    ),
  },
  {
    id: "simplewebauthn",
    sortName: "SimpleWebAuthn",
    packageName: "@simplewebauthn/browser",
    version: "13.3.0",
    copyright: "Copyright (c) SimpleWebAuthn contributors.",
    licenseShort: "MIT",
    homepage: "https://simplewebauthn.dev/",
    usageNoteKey: "ossLicenseSimpleWebAuthnUsage",
    licenseText: mitLicenseText("Copyright (c) SimpleWebAuthn contributors."),
  },
  {
    id: "zlib",
    sortName: "zlib",
    packageName: "zlib (Node.js zlib / DEFLATE)",
    version: "Node.js built-in",
    copyright: "(C) 1995-2024 Jean-loup Gailly and Mark Adler",
    licenseShort: "zlib License",
    homepage: "https://zlib.net/",
    usageNoteKey: "ossLicenseZlibUsage",
    licenseText: `zlib.h -- interface of the 'zlib' general purpose compression library
version 1.3.1, January 22nd, 2024

Copyright (C) 1995-2024 Jean-loup Gailly and Mark Adler

This software is provided 'as-is', without any express or implied
warranty.  In no event will the authors be held liable for any damages
arising from the use of this software.

Permission is granted to anyone to use this software for any purpose,
including commercial applications, and to alter it and redistribute it
freely, subject to the following restrictions:

1. The origin of this software must not be misrepresented; you must not
   claim that you wrote the original software. If you use this software
   in a product, an acknowledgment in the product documentation would be
   appreciated but is not required.
2. Altered source versions must be plainly marked as such, and must not be
   misrepresented as being the original software.
3. This notice may not be removed or altered from any source distribution.

Jean-loup Gailly        Mark Adler
jloup@gzip.org          madler@alumni.caltech.edu`,
  },
  {
    id: "zstandard",
    sortName: "Zstandard",
    packageName: "Zstandard (libzstd / fzstd / zstd-codec)",
    version: "fzstd 0.1.1 · zstd-codec 0.1.5",
    copyright: "Copyright (c) Meta Platforms, Inc. and affiliates.",
    licenseShort: "BSD-3-Clause OR GPLv2",
    homepage: "https://github.com/facebook/zstd",
    usageNoteKey: "ossLicenseZstandardUsage",
    licenseText: `BSD License

For Zstandard software

Copyright (c) Meta Platforms, Inc. and affiliates. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

 * Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

 * Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

 * Neither the name Facebook, nor Meta, nor the names of its contributors may
   be used to endorse or promote products derived from this software without
   specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

---

This program is also available under the terms of the GNU General Public License
version 2 (GPLv2). See https://www.gnu.org/licenses/old-licenses/gpl-2.0.html`,
  },
];
