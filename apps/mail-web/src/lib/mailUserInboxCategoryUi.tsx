import type { ReactNode } from "react";

export type MailUserInboxCategory = {
  id: string;
  name: string;
  colorKey: string;
  iconKey: string;
  sortOrder: number;
  messageCount?: number;
};

export const USER_CATEGORY_COLOR_KEYS = [
  "red",
  "orange",
  "yellow",
  "green",
  "teal",
  "blue",
  "purple",
  "gray",
] as const;

export const USER_CATEGORY_ICON_KEYS = [
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

const COLOR_MAP: Record<string, { bg: string; fg: string; stroke: string }> = {
  red: { bg: "#fee2e2", fg: "#b91c1c", stroke: "#ef4444" },
  orange: { bg: "#ffedd5", fg: "#c2410c", stroke: "#f97316" },
  yellow: { bg: "#fef9c3", fg: "#a16207", stroke: "#eab308" },
  green: { bg: "#dcfce7", fg: "#15803d", stroke: "#22c55e" },
  teal: { bg: "#ccfbf1", fg: "#0f766e", stroke: "#14b8a6" },
  blue: { bg: "#dbeafe", fg: "#1d4ed8", stroke: "#3b82f6" },
  purple: { bg: "#ede9fe", fg: "#6d28d9", stroke: "#8b5cf6" },
  gray: { bg: "#f3f4f6", fg: "#374151", stroke: "#9ca3af" },
};

export function userCategoryColors(colorKey: string) {
  return COLOR_MAP[colorKey] ?? COLOR_MAP.blue;
}

export function UserCategoryTagIcon({
  iconKey,
  colorKey,
  size = 16,
}: {
  iconKey: string;
  colorKey: string;
  size?: number;
}) {
  const { stroke } = userCategoryColors(colorKey);
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (iconKey) {
    case "star":
      return (
        <svg {...common}>
          <path d="M12 3l2.9 6.1L22 10.2l-5 4.3 1.6 6.5L12 17.8 5.4 21l1.6-6.5-5-4.3 7.1-1.1z" />
        </svg>
      );
    case "briefcase":
      return (
        <svg {...common}>
          <rect x="3" y="8" width="18" height="12" rx="2" />
          <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      );
    case "truck":
      return (
        <svg {...common}>
          <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7v-6z" />
          <circle cx="7" cy="18" r="2" />
          <circle cx="18" cy="18" r="2" />
        </svg>
      );
    case "wallet":
      return (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M16 12h2" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M4 11h16" />
        </svg>
      );
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
      );
    case "flag":
      return (
        <svg {...common}>
          <path d="M5 3v18M5 4h12l-2 4 2 4H5" />
        </svg>
      );
    case "bookmark":
      return (
        <svg {...common}>
          <path d="M6 4h12v16l-6-4-6 4V4z" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M6 10a6 6 0 0 1 12 0c0 7 3 7 3 7H3s3 0 3-7" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M4 4l7 14 2-6 6-2L4 4z" />
        </svg>
      );
  }
}

export function UserCategoryBadge({
  category,
  compact,
}: {
  category: MailUserInboxCategory;
  compact?: boolean;
}) {
  const colors = userCategoryColors(category.colorKey);
  return (
    <span
      className={`mail-user-category-badge${compact ? " mail-user-category-badge--compact" : ""}`}
      style={{
        background: colors.bg,
        color: colors.fg,
        borderColor: colors.stroke,
      }}
      title={category.name}
    >
      <UserCategoryTagIcon
        iconKey={category.iconKey}
        colorKey={category.colorKey}
        size={compact ? 12 : 14}
      />
      {!compact ? <span>{category.name}</span> : null}
    </span>
  );
}

export function userCategoryIconLabelKey(iconKey: string): string {
  return `userCategoryIcon_${iconKey}`;
}

export function userCategoryColorLabelKey(colorKey: string): string {
  return `userCategoryColor_${colorKey}`;
}
