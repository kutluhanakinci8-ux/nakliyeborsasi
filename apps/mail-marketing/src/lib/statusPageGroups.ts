import type { MailPublicStatusPage, PublicServiceStatus } from "./publicStatus";

export type StatusComponentGroup = {
  id: string;
  titleTr: string;
  leadTr?: string;
  components: MailPublicStatusPage["components"];
  syntheticNoteTr?: string;
};

const POSTA_IDS = ["inbound", "outbound", "webmail"] as const;
const PLATFORM_IDS = ["api", "console"] as const;

function pickComponents(
  page: MailPublicStatusPage,
  ids: readonly string[],
): MailPublicStatusPage["components"] {
  const map = new Map(page.components.map((c) => [c.id, c]));
  return ids.map((id) => map.get(id)).filter(Boolean) as MailPublicStatusPage["components"];
}

function syntheticMessagingRows(
  overall: PublicServiceStatus,
  apiStatus: PublicServiceStatus | undefined,
): MailPublicStatusPage["components"] {
  const chatStatus = overall;
  const api = apiStatus ?? overall;
  return [
    {
      id: "messaging-web",
      nameTr: "Mesaj — sohbet (web)",
      status: chatStatus,
      descriptionTr: "u88.lerta.com.tr",
    },
    {
      id: "messaging-api",
      nameTr: "Mesaj — API",
      status: api,
      descriptionTr: "Mesajlaşma ve bildirim uç noktaları",
    },
  ];
}

/** Vitrin durum sayfası — Posta / Mesaj / Platform grupları. */
export function buildStatusDisplayGroups(page: MailPublicStatusPage): StatusComponentGroup[] {
  const apiRow = page.components.find((c) => c.id === "api");

  return [
    {
      id: "posta",
      titleTr: "Lerta Posta",
      leadTr: "Gelen, giden ve webmail.",
      components: pickComponents(page, POSTA_IDS),
    },
    {
      id: "mesaj",
      titleTr: "Lerta Mesaj",
      leadTr: "Sohbet ve mesaj API (platform sağlığı ile senkron; ayrı izleme genişlemesi planlanır).",
      components: syntheticMessagingRows(page.overall, apiRow?.status),
      syntheticNoteTr:
        "Mesaj bileşenleri şu an platform genel durumu ve API sağlığından türetilir; ayrıntılı mesaj izleme yol haritasında.",
    },
    {
      id: "platform",
      titleTr: "Platform",
      leadTr: "API, kimlik doğrulama ve yönetim konsolu.",
      components: pickComponents(page, PLATFORM_IDS),
    },
  ];
}

export function groupOverallStatus(
  components: MailPublicStatusPage["components"],
): PublicServiceStatus {
  const order: PublicServiceStatus[] = [
    "major_outage",
    "degraded",
    "maintenance",
    "operational",
  ];
  for (const level of order) {
    if (components.some((c) => c.status === level)) return level;
  }
  return "operational";
}
