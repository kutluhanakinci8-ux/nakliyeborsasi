export const MAIL_USER_CATEGORY_COLOR_KEYS = [
  "red",
  "orange",
  "yellow",
  "green",
  "teal",
  "blue",
  "purple",
  "gray",
] as const;

export const MAIL_USER_CATEGORY_ICON_KEYS = [
  "tag",
  "star",
  "briefcase",
  "truck",
  "wallet",
  "calendar",
  "user",
  "flag",
  "bookmark",
  "bell",
] as const;

export type MailUserCategoryColorKey =
  (typeof MAIL_USER_CATEGORY_COLOR_KEYS)[number];
export type MailUserCategoryIconKey =
  (typeof MAIL_USER_CATEGORY_ICON_KEYS)[number];

export function normalizeUserCategoryColorKey(
  raw: string | null | undefined,
): MailUserCategoryColorKey {
  const value = (raw ?? "blue").trim().toLowerCase();
  return (MAIL_USER_CATEGORY_COLOR_KEYS as readonly string[]).includes(value)
    ? (value as MailUserCategoryColorKey)
    : "blue";
}

export function normalizeUserCategoryIconKey(
  raw: string | null | undefined,
): MailUserCategoryIconKey {
  const value = (raw ?? "tag").trim().toLowerCase();
  return (MAIL_USER_CATEGORY_ICON_KEYS as readonly string[]).includes(value)
    ? (value as MailUserCategoryIconKey)
    : "tag";
}

export const DEFAULT_USER_INBOX_CATEGORIES: Array<{
  name: string;
  colorKey: MailUserCategoryColorKey;
  iconKey: MailUserCategoryIconKey;
}> = [
  { name: "Kırmızı kategori", colorKey: "red", iconKey: "tag" },
  { name: "Mavi kategori", colorKey: "blue", iconKey: "tag" },
  { name: "Mor kategori", colorKey: "purple", iconKey: "tag" },
  { name: "Sarı kategori", colorKey: "yellow", iconKey: "tag" },
  { name: "Turuncu kategori", colorKey: "orange", iconKey: "tag" },
  { name: "Yeşil kategori", colorKey: "green", iconKey: "tag" },
];
