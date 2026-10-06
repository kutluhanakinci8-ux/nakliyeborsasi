export type EkolojikHubSection =
  | "posta"
  | "mesajlar"
  | "sosyal"
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
    case "sosyal":
    case "kanallar":
      return "sosyal";
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
