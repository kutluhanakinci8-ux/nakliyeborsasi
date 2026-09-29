export function trustParticipantLabel(code: string | null | undefined): string {
  switch (code) {
    case "LOAD_SHIPPER":
      return "Yük sahibi";
    case "LOAD_CARRIER":
      return "Nakliyeci";
    case "LOAD_SEEKER":
      return "Yük arayan";
    default:
      return "Kurumsal partner";
  }
}

export const TRUST_REVIEW_HIGHLIGHTS = [
  "Zamanında teslim",
  "İletişim",
  "Evrak düzeni",
  "Fiyat şeffaflığı",
  "Araç uygunluğu",
] as const;
