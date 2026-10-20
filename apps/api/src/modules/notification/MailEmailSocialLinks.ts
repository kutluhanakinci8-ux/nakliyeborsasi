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

/** Yedek: harici ikon (çoğu istemci için gömülü data URI kullanılır). */
export const MAIL_EMAIL_SOCIAL_ICON_BASE_URL =
  "https://posta.lerta.com.tr/email-social";

/** E-posta önizleme / Outlook uyumu: harici img yerine gömülü SVG. */
const PLATFORM_ICON_DATA_URI: Record<MailEmailSocialPlatform, string> = {
  instagram:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'%3E%3Crect x='3' y='3' width='18' height='18' rx='5' stroke='%235f6570' stroke-width='1.75'/%3E%3Ccircle cx='12' cy='12' r='4.25' stroke='%235f6570' stroke-width='1.75'/%3E%3Ccircle cx='17.2' cy='6.8' r='1.1' fill='%235f6570'/%3E%3C/svg%3E",
  facebook:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%235f6570' d='M14.5 8.5H13c-.8 0-1 .4-1 1v1.5h2.5l-.4 2.5H12v7h-2.5v-7H8v-2.5h1.5V9c0-2 1.2-3.5 3.8-3.5h1.7v2.5z'/%3E%3C/svg%3E",
  linkedin:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Crect x='4' y='9' width='3.5' height='11' fill='%235f6570'/%3E%3Ccircle cx='5.75' cy='5.75' r='2' fill='%235f6570'/%3E%3Cpath fill='%235f6570' d='M11 9h3.3v1.5c.6-1 1.7-1.7 3.2-1.7 3.4 0 4.5 2.2 4.5 5.1V20H18.5v-6.8c0-1.6-.3-3.5-2.5-3.5-2.1 0-2.5 1.6-2.5 3.2V20H11V9z'/%3E%3C/svg%3E",
  x:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%235f6570' d='M13.2 10.8L18.4 4h-1.2l-4.5 5.9L9.2 4H4l5.5 7.4L4 20h1.2l4.8-6.2 3.8 6.2H20l-5.8-7.4z'/%3E%3C/svg%3E",
  youtube:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'%3E%3Crect x='3' y='6.5' width='18' height='11' rx='3' stroke='%235f6570' stroke-width='1.75'/%3E%3Cpath fill='%235f6570' d='M10.5 9.5v5l4.5-2.5-4.5-2.5z'/%3E%3C/svg%3E",
  tiktok:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%235f6570' d='M14.5 5.5c.8 1.6 2.2 2.8 4 3v2.8c-1.5 0-2.9-.5-4-1.3v5.5c0 3-2.4 5.2-5.5 5.2S3.5 18.5 3.5 15.5 5.9 10.3 9 10.3c.4 0 .9.1 1.3.2v3c-.3-.1-.6-.2-1-.2-1.4 0-2.5 1.1-2.5 2.5s1.1 2.5 2.5 2.5 2.5-1.1 2.5-2.5V5.5h2.7z'/%3E%3C/svg%3E",
  website:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'%3E%3Ccircle cx='12' cy='12' r='8.25' stroke='%235f6570' stroke-width='1.75'/%3E%3Cpath stroke='%235f6570' stroke-width='1.75' d='M4 12h16M12 3.75c2.5 2.8 2.5 14.7 0 16.5M12 3.75c-2.5 2.8-2.5 14.7 0 16.5'/%3E%3C/svg%3E",
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
    if (out.length >= 7) {
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
  if (
    !value.startsWith("@") &&
    !value.includes("/") &&
    !value.includes(".") &&
    (platform === "instagram" ||
      platform === "x" ||
      platform === "tiktok")
  ) {
    value = `@${value}`;
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
  if (/^http:\/\//i.test(value)) {
    value = `https://${value.slice(7)}`;
  }
  if (!/^https:\/\//i.test(value)) {
    if (/^[\w.-]+\.[a-z]{2,}/i.test(value) || value.includes("/")) {
      value = `https://${value.replace(/^\/+/, "")}`;
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
  _accentColor = "#4f46e5",
): string {
  if (links.length === 0) {
    return "";
  }
  const cells = links
    .map((link) => {
      const label = escapeHtml(PLATFORM_LABEL[link.platform]);
      const href = escapeHtml(link.url);
      const iconUrl = escapeHtml(PLATFORM_ICON_DATA_URI[link.platform]);
      return `<td style="padding:0 8px;" align="center" valign="middle">
<a href="${href}" title="${label}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
<table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:separate;">
<tr>
<td align="center" valign="middle" width="44" height="44" style="width:44px;height:44px;border-radius:50%;border:1px solid #c7cdd6;background-color:#ffffff;mso-line-height-rule:exactly;line-height:44px;">
<img src="${iconUrl}" width="22" height="22" alt="${label}" style="display:block;margin:0 auto;border:0;outline:none;text-decoration:none;max-width:22px;height:auto;" />
</td>
</tr>
</table>
</a>
</td>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0;">
<tr>
<td style="padding:20px 28px 8px;border-top:1px solid #e8eaef;">
<p style="margin:0 0 14px;font-size:12px;line-height:1.5;color:#8b919c;text-align:center;font-family:Segoe UI,system-ui,sans-serif;">Bizi sosyal medyada takip edin</p>
<table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;">
<tr>${cells}</tr>
</table>
</td>
</tr>
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
