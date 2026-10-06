import { EKOLOJIK_HUB_PATH } from "./ekolojikSocialMessagingDeepLink";
import type { MailWebEmbedHandoff } from "./mailWebEmbedDeepLink";

export function readEkolojikMailAiComposeFromSearchParams(
  searchParams: URLSearchParams,
): Pick<
  MailWebEmbedHandoff,
  "openCompose" | "composeRich" | "composeAiAssist" | "composeTo"
> {
  const aiRaw =
    searchParams.get("composeAi") ?? searchParams.get("mailAiCompose");
  const composeAiAssist =
    aiRaw === "1" || aiRaw?.toLowerCase() === "true" ? true : undefined;
  if (!composeAiAssist) {
    return {};
  }
  const composeTo = searchParams.get("composeTo")?.trim() ?? undefined;
  return {
    openCompose: true,
    composeRich: true,
    composeAiAssist: true,
    composeTo,
  };
}

export function ekolojikMailAiComposeHubHref(composeTo?: string): string {
  const params = new URLSearchParams({
    bolum: "posta",
    compose: "1",
    composeRich: "1",
    composeAi: "1",
  });
  if (composeTo?.trim()) {
    params.set("composeTo", composeTo.trim());
  }
  return `${EKOLOJIK_HUB_PATH}?${params.toString()}`;
}

export function isEkolojikMailAiComposeHub(
  bolum: string | null,
  searchParams: URLSearchParams,
): boolean {
  if (bolum !== "posta" && bolum !== null && bolum !== "") {
    return false;
  }
  const aiRaw =
    searchParams.get("composeAi") ?? searchParams.get("mailAiCompose");
  const raw = aiRaw?.toLowerCase();
  return raw === "1" || raw === "true";
}
