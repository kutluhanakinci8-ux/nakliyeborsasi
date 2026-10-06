import type { ReadonlyURLSearchParams } from "next/navigation";
import type { EkolojikHubSection } from "./ekolojikHubTypes";

export function isEkolojikMessagingChatSection(section: EkolojikHubSection): boolean {
  return section === "mesajlar" || section === "sosyal-dm";
}

export function isEkolojikSocialDmInbox(
  section: EkolojikHubSection,
  searchParams: ReadonlyURLSearchParams,
): boolean {
  return (
    section === "sosyal-dm" ||
    (section === "mesajlar" &&
      searchParams.get("filter")?.toLowerCase() === "social")
  );
}

export function applyEkolojikSectionQueryParams(
  params: URLSearchParams,
  next: EkolojikHubSection,
): void {
  params.set("bolum", next);
  if (next === "sosyal-dm") {
    params.set("filter", "social");
  } else if (next === "mesajlar") {
    params.delete("filter");
    params.delete("threadId");
  }
}
