export const MAIL_EMAIL_SOCIAL_PLATFORMS = [
  "instagram",
  "facebook",
  "linkedin",
  "x",
  "youtube",
  "tiktok",
  "website",
] as const;

export type MailEmailSocialPlatform = (typeof MAIL_EMAIL_SOCIAL_PLATFORMS)[number];

export type MailEmailSocialLink = {
  platform: MailEmailSocialPlatform;
  url: string;
};

const PLATFORM_LABEL: Record<MailEmailSocialPlatform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  x: "X",
  youtube: "YouTube",
  tiktok: "TikTok",
  website: "Web",
};

const PLATFORM_SHORT: Record<MailEmailSocialPlatform, string> = {
  instagram: "IG",
  facebook: "f",
  linkedin: "in",
  x: "X",
  youtube: "▶",
  tiktok: "TT",
  website: "⌂",
};

export function normalizeMailEmailSocialLinks(
  raw: unknown,
): MailEmailSocialLink[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const seen = new Set<MailEmailSocialPlatform>();
  const out: MailEmailSocialLink[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const platform = String(
      (row as { platform?: string }).platform ?? "",
    ).toLowerCase() as MailEmailSocialPlatform;
    if (!MAIL_EMAIL_SOCIAL_PLATFORMS.includes(platform)) {
      continue;
    }
    if (seen.has(platform)) {
      continue;
    }
    const url = normalizeSocialUrl(
      String((row as { url?: string }).url ?? ""),
      platform,
    );
    if (!url) {
      continue;
    }
    seen.add(platform);
    out.push({ platform, url });
    if (out.length >= 6) {
      break;
    }
  }
  return out;
}

function normalizeSocialUrl(
  raw: string,
  platform: MailEmailSocialPlatform,
): string | null {
  let value = raw.trim();
  if (!value) {
    return null;
  }
  if (value.startsWith("@")) {
    const handle = value.slice(1).replace(/[^\w.]/g, "");
    if (!handle) {
      return null;
    }
    if (platform === "instagram") {
      value = `https://instagram.com/${handle}`;
    } else if (platform === "x") {
      value = `https://x.com/${handle}`;
    } else if (platform === "tiktok") {
      value = `https://www.tiktok.com/@${handle}`;
    } else {
      return null;
    }
  }
  if (!/^https:\/\//i.test(value)) {
    if (platform === "website" && /^[\w.-]+\.[a-z]{2,}/i.test(value)) {
      value = `https://${value}`;
    } else {
      return null;
    }
  }
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") {
      return null;
    }
    if (parsed.hostname === "localhost") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function buildEmailSocialFooterHtml(
  links: MailEmailSocialLink[],
  accentColor = "#4f46e5",
): string {
  if (links.length === 0) {
    return "";
  }
  const cells = links
    .map((link) => {
      const short = escapeHtml(PLATFORM_SHORT[link.platform]);
      const label = escapeHtml(PLATFORM_LABEL[link.platform]);
      const href = escapeHtml(link.url);
      return `<td style="padding:0 6px;">
<a href="${href}" title="${label}" style="display:inline-block;width:40px;height:40px;line-height:40px;text-align:center;border-radius:50%;border:2px solid ${escapeHtml(accentColor)};color:${escapeHtml(accentColor)};font-size:14px;font-weight:700;text-decoration:none;">${short}</a>
</td>`;
    })
    .join("");
  return `<table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:16px auto 12px;">
<tr>${cells}</tr>
</table>`;
}

export function buildEmailSocialFooterPlain(links: MailEmailSocialLink[]): string {
  if (links.length === 0) {
    return "";
  }
  return links
    .map((link) => `${PLATFORM_LABEL[link.platform]}: ${link.url}`)
    .join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}
