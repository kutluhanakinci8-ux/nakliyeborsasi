import { vitrinPath } from "./vitrinUrls";

/** Posta login + shell — www vitrin ile hizalı sabit yollar. */
export const MAIL_VITRIN_PATHS = {
  posta: "/posta",
  mesaj: "/mesaj",
  kvkk: "/kvkk",
  u88: "/u88",
  durum: "/durum",
  sss: "/sss",
  kurumsal: "/kurumsal",
} as const;

export type MailVitrinNavKey = "posta" | "mesaj" | "kvkk";

export const MAIL_VITRIN_NAV: Array<{
  key: MailVitrinNavKey;
  path: string;
  labelKey: string;
}> = [
  { key: "posta", path: MAIL_VITRIN_PATHS.posta, labelKey: "vitrinNavPosta" },
  { key: "mesaj", path: MAIL_VITRIN_PATHS.mesaj, labelKey: "vitrinNavMesaj" },
  { key: "kvkk", path: MAIL_VITRIN_PATHS.kvkk, labelKey: "vitrinNavKvkk" },
];

export function mailVitrinUrl(path: string): string {
  return vitrinPath(path);
}
