import { EKOLOJIK_HUB_PATH } from "./ekolojikSocialMessagingDeepLink";
import type { MailWebEmbedHandoff } from "./mailWebEmbedDeepLink";

export const EKOLOJIK_MAIL_BUILTIN_TEMPLATE_PREFIX = "builtin:";

export type EkolojikMailComposeDeepLink = Pick<
  MailWebEmbedHandoff,
  | "openCompose"
  | "composeTo"
  | "composeRich"
  | "composeTemplateId"
  | "composeMultipart"
  | "composeAiAssist"
>;

export function normalizeEkolojikMailComposeTemplateId(
  raw: string | null | undefined,
): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.includes(":")) {
    return trimmed;
  }
  return `${EKOLOJIK_MAIL_BUILTIN_TEMPLATE_PREFIX}${trimmed}`;
}

export function readEkolojikMailComposeFromSearchParams(
  searchParams: URLSearchParams,
): EkolojikMailComposeDeepLink {
  const composeRaw =
    searchParams.get("compose") ?? searchParams.get("openCompose");
  const openCompose =
    composeRaw === "1" || composeRaw?.toLowerCase() === "true";
  const composeTo = searchParams.get("composeTo")?.trim() ?? undefined;
  const richRaw = searchParams.get("composeRich");
  const composeRich =
    richRaw === "1" || richRaw?.toLowerCase() === "true"
      ? true
      : richRaw === "0"
        ? false
        : undefined;
  const multipartRaw =
    searchParams.get("composeMultipart") ?? searchParams.get("multipart");
  const composeMultipart =
    multipartRaw === "1" || multipartRaw?.toLowerCase() === "true";
  const aiRaw =
    searchParams.get("composeAi") ?? searchParams.get("mailAiCompose");
  const composeAiAssist =
    aiRaw === "1" || aiRaw?.toLowerCase() === "true" ? true : undefined;
  const composeTemplateId = normalizeEkolojikMailComposeTemplateId(
    searchParams.get("composeTemplate") ??
      searchParams.get("mailTemplate") ??
      searchParams.get("template"),
  );
  return {
    openCompose:
      openCompose ||
      Boolean(composeTemplateId) ||
      composeMultipart ||
      composeAiAssist,
    composeTo,
    composeRich: composeAiAssist ? true : composeRich,
    composeTemplateId,
    composeMultipart: composeMultipart || undefined,
    composeAiAssist,
  };
}

export function ekolojikMailRichComposeHref(options?: {
  composeTo?: string;
  templateSlug?: string;
  multipart?: boolean;
}): string {
  const params = new URLSearchParams({
    bolum: "posta",
    compose: "1",
    composeRich: "1",
  });
  if (options?.composeTo?.trim()) {
    params.set("composeTo", options.composeTo.trim());
  }
  const templateId = normalizeEkolojikMailComposeTemplateId(
    options?.templateSlug,
  );
  if (templateId) {
    params.set("composeTemplate", templateId);
  }
  if (options?.multipart) {
    params.set("composeMultipart", "1");
  }
  return `${EKOLOJIK_HUB_PATH}?${params.toString()}`;
}

export function isEkolojikMailRichComposeHub(
  bolum: string | null,
  searchParams: URLSearchParams,
): boolean {
  if (bolum !== "posta" && bolum !== null && bolum !== "") {
    return false;
  }
  const link = readEkolojikMailComposeFromSearchParams(searchParams);
  return (
    link.openCompose === true &&
    !link.composeAiAssist &&
    (link.composeRich === true ||
      Boolean(link.composeTemplateId) ||
      link.composeMultipart === true)
  );
}
