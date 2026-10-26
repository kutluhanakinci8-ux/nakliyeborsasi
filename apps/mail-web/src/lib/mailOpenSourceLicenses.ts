/** Kayıt: ayarlar → Lisanslar listesi. Yeni kütüphaneler buraya eklenir. */
export type OpenSourceLicenseEntry = {
  id: string;
  /** Sıralama (Gmail tarzı alfabetik liste). */
  sortName: string;
  packageName: string;
  version?: string;
  copyright: string;
  licenseShort: string;
  homepage?: string;
  /** Tam lisans metni (ekranında gösterilir). */
  licenseText: string;
  /** Posta istemcisinde kullanım notu (TR/EN ayrı anahtarlar panelde). */
  usageNoteKey: string;
};

export const OPEN_SOURCE_LICENSES: OpenSourceLicenseEntry[] = [
  {
    id: "zstandard",
    sortName: "Zstandard",
    packageName: "Zstandard (libzstd / fzstd)",
    version: "fzstd 0.1.1 · libzstd",
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
