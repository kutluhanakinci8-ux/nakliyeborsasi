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

/** E-posta istemcileri için HTTPS ikonlar (posta.lerta.com.tr static). */
export const MAIL_EMAIL_SOCIAL_ICON_BASE_URL =
  "https://posta.lerta.com.tr/email-social";

const PLATFORM_ICON_FILE: Record<MailEmailSocialPlatform, string> = {
  instagram: "instagram.svg",
  facebook: "facebook.svg",
  linkedin: "linkedin.svg",
  x: "x.svg",
  youtube: "youtube.svg",
  tiktok: "tiktok.svg",
  website: "website.svg",
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
  const iconBase = MAIL_EMAIL_SOCIAL_ICON_BASE_URL.replace(/\/$/, "");
  const cells = links
    .map((link) => {
      const label = escapeHtml(PLATFORM_LABEL[link.platform]);
      const href = escapeHtml(link.url);
      const iconFile = PLATFORM_ICON_FILE[link.platform];
      const iconUrl = escapeHtml(`${iconBase}/${iconFile}`);
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
