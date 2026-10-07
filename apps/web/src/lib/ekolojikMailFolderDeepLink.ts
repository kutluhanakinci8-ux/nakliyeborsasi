import {
  parseMailWebEmbedView,
  type MailWebEmbedView,
} from "./mailWebEmbedDeepLink";
import { EKOLOJIK_HUB_PATH } from "./ekolojikSocialMessagingDeepLink";

export function ekolojikMailViewHubHref(mailView: MailWebEmbedView): string {
  const params = new URLSearchParams();
  params.set("bolum", "posta");
  params.set("mailView", mailView);
  return `${EKOLOJIK_HUB_PATH}?${params.toString()}`;
}

export function readEkolojikMailViewFromSearchParams(
  searchParams: URLSearchParams,
): MailWebEmbedView | null {
  return parseMailWebEmbedView(searchParams.get("mailView"));
}

export function isEkolojikMailViewHub(
  bolum: string | null,
  searchParams: URLSearchParams,
  mailView: MailWebEmbedView,
): boolean {
  if (bolum !== "posta" && bolum !== null && bolum !== "") {
    return false;
  }
  return readEkolojikMailViewFromSearchParams(searchParams) === mailView;
}
