export type SocialHubUtmParams = {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent?: string | null;
};

export type SocialHubUtmInput = {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
};

const URL_IN_TEXT =
  /https?:\/\/[^\s<>"')\]]+/gi;

export function normalizeSocialHubUtmInput(
  input: SocialHubUtmInput | null | undefined,
): SocialHubUtmParams | null {
  if (!input) {
    return null;
  }
  const campaign = input.utmCampaign?.trim();
  if (!campaign) {
    return null;
  }
  const source = input.utmSource?.trim() || "lerta";
  const medium = input.utmMedium?.trim() || "social";
  const content = input.utmContent?.trim() || null;
  return {
    utmSource: source.slice(0, 120),
    utmMedium: medium.slice(0, 120),
    utmCampaign: campaign.slice(0, 180),
    utmContent: content ? content.slice(0, 180) : null,
  };
}

export function parseSocialHubUtmParamsJson(
  raw: string | null | undefined,
): SocialHubUtmParams | null {
  if (!raw?.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as SocialHubUtmInput;
    return normalizeSocialHubUtmInput(parsed);
  } catch {
    return null;
  }
}

export function serializeSocialHubUtmParams(
  params: SocialHubUtmParams | null,
): string | null {
  if (!params) {
    return null;
  }
  return JSON.stringify(params);
}

export function appendUtmToUrlsInText(
  text: string,
  utm: SocialHubUtmParams,
): string {
  return text.replace(URL_IN_TEXT, (url) => appendUtmToUrl(url, utm));
}

function appendUtmToUrl(url: string, utm: SocialHubUtmParams): string {
  const trimmed = url.replace(/[.,;:!?)]+$/, "");
  const trailing = url.slice(trimmed.length);
  try {
    const parsed = new URL(trimmed);
    if (!parsed.searchParams.has("utm_source")) {
      parsed.searchParams.set("utm_source", utm.utmSource);
    }
    if (!parsed.searchParams.has("utm_medium")) {
      parsed.searchParams.set("utm_medium", utm.utmMedium);
    }
    if (!parsed.searchParams.has("utm_campaign")) {
      parsed.searchParams.set("utm_campaign", utm.utmCampaign);
    }
    if (utm.utmContent && !parsed.searchParams.has("utm_content")) {
      parsed.searchParams.set("utm_content", utm.utmContent);
    }
    return `${parsed.toString()}${trailing}`;
  } catch {
    return url;
  }
}

export function resolvePublishBodyText(
  bodyText: string,
  utmParamsJson: string | null,
): string {
  const utm = parseSocialHubUtmParamsJson(utmParamsJson);
  if (!utm) {
    return bodyText;
  }
  return appendUtmToUrlsInText(bodyText, utm);
}
