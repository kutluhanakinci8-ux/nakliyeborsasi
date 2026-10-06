export type EkolojikHubSection =
  | "posta"
  | "mesajlar"
  | "sosyal-dm"
  | "grup-sohbet"
  | "sosyal"
  | "entegrasyon"
  | "bildirimler"
  | "fatura"
  | "gonderilen"
  | "arsiv";

export function parseEkolojikHubSection(
  raw: string | null,
): EkolojikHubSection {
  switch (raw?.trim()) {
    case "mesajlar":
    case "musteri":
      return "mesajlar";
    case "sosyal-dm":
    case "sosyal_dm":
    case "sosyalmesaj":
      return "sosyal-dm";
    case "grup-sohbet":
    case "grup":
    case "grupsohbet":
      return "grup-sohbet";
    case "sosyal":
    case "kanallar":
      return "sosyal";
    case "entegrasyon":
    case "api":
    case "zapier":
      return "entegrasyon";
    case "bildirimler":
    case "bildirim":
      return "bildirimler";
    case "fatura":
      return "fatura";
    case "gonderilen":
      return "gonderilen";
    case "arsiv":
      return "arsiv";
    default:
      return "posta";
  }
}
