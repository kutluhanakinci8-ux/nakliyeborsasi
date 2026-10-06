import { EKOLOJIK_HUB_PATH } from "./ekolojikSocialMessagingDeepLink";

/** EK-M6: FS-12 köprü ayarlarını hub içinde açar (`waBridge=1`). */
export function ekolojikWhatsappBridgeHubHref(
  section: "mesajlar" | "sosyal-dm" = "mesajlar",
): string {
  const params = new URLSearchParams({
    bolum: section,
    waBridge: "1",
  });
  return `${EKOLOJIK_HUB_PATH}?${params.toString()}`;
}
