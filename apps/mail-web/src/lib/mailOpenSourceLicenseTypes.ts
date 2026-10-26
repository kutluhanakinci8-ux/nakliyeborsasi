/** Kayıt: ayarlar → Lisanslar listesi. */
export type OpenSourceLicenseEntry = {
  id: string;
  sortName: string;
  packageName: string;
  version?: string;
  copyright: string;
  licenseShort: string;
  homepage?: string;
  licenseText: string;
  usageNoteKey: string;
};
