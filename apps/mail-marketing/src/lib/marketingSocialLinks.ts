export type MarketingSocialId =
  | "linkedin"
  | "instagram"
  | "x"
  | "youtube";

export type MarketingSocialLink = {
  id: MarketingSocialId;
  label: string;
  /** `#` = henüz yapılandırılmadı (tıklama sayfayı kaydırmaz). */
  href: string;
};

/** Gerçek URL’ler hazır olunca env veya burada güncellenir. */
export const MARKETING_SOCIAL_LINKS: MarketingSocialLink[] = [
  {
    id: "linkedin",
    label: "LinkedIn",
    href: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN ?? "#",
  },
  {
    id: "instagram",
    label: "Instagram",
    href: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM ?? "#",
  },
  {
    id: "x",
    label: "X",
    href: process.env.NEXT_PUBLIC_SOCIAL_X ?? "#",
  },
  {
    id: "youtube",
    label: "YouTube",
    href: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE ?? "#",
  },
];
