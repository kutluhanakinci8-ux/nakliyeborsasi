import { EKOLOJIK_HUB_PATH } from "./ekolojikSocialMessagingDeepLink";
import { ekolojikWhatsappBridgeHubHref } from "./ekolojikWhatsappBridgeDeepLink";

export const EKOLOJIK_INTEGRATIONS_HUB_PATH = `${EKOLOJIK_HUB_PATH}?bolum=entegrasyon`;

export function ekolojikMessagingChannelSettingsHref(): string {
  return ekolojikWhatsappBridgeHubHref("mesajlar");
}
