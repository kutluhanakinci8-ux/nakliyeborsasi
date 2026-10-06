export const EKOLOJIK_HUB_PATH = "/marketim/posta-ve-mesaj";

/** EK-M5: Social Hub → Mesajlar köprüsü (IG / WA / Telegram DM thread’leri). */
export function ekolojikSocialDmInboxHref(threadId?: string): string {
  const params = new URLSearchParams({
    bolum: "sosyal-dm",
    filter: "social",
  });
  if (threadId?.trim()) {
    params.set("threadId", threadId.trim());
  }
  return `${EKOLOJIK_HUB_PATH}?${params.toString()}`;
}
