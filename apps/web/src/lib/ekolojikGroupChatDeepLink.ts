import { EKOLOJIK_HUB_PATH } from "./ekolojikSocialMessagingDeepLink";

export function ekolojikGroupInboxHref(openCreateModal = false): string {
  const params = new URLSearchParams({
    bolum: "grup-sohbet",
    filter: "group",
  });
  if (openCreateModal) {
    params.set("group", "1");
  }
  return `${EKOLOJIK_HUB_PATH}?${params.toString()}`;
}
