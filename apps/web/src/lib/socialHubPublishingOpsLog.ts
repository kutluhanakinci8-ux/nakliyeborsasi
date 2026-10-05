import type { SocialHubOpsLogEntry } from "./socialHubConnectionsOpsLog";
import type {
  SocialHubPermissions,
  SocialHubPost,
  SocialHubSnapshot,
} from "./socialHubTypes";

function push(
  entries: SocialHubOpsLogEntry[],
  entry: Omit<SocialHubOpsLogEntry, "id"> & { id?: string },
): void {
  const id =
    entry.id ??
    `${entry.channel ?? "sys"}-${entries.length}-${entry.message.slice(0, 24)}`;
  entries.push({ ...entry, id });
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Taslak",
  PENDING_APPROVAL: "Onay bekliyor",
  APPROVED: "Onaylandı",
  SCHEDULED: "Zamanlandı",
  PUBLISHING: "Yayınlanıyor",
  PUBLISHED: "Yayınlandı",
  FAILED: "Başarısız",
  CANCELLED: "İptal",
};

export function publishingPanelLead(scheduledCount: number): string {
  if (scheduledCount > 0) {
    return `${scheduledCount} zamanlanmış gönderi var. Taslak oluşturun, onaylayın veya takvimden yönetin.`;
  }
  return "Taslak oluşturun, kanal seçin ve paylaşın veya zamanlayın.";
}

export function postUserSummary(
  post: SocialHubPost,
  platformLabels: string[],
): string {
  const channels =
    platformLabels.length > 0 ? platformLabels.join(", ") : "Kanal seçilmedi";
  if (post.statusCode === "FAILED") {
    return `Yayın başarısız — ${channels}. Ayrıntı operasyon günlüğünde.`;
  }
  if (post.statusCode === "PENDING_APPROVAL") {
    return `Onay bekliyor · ${channels}`;
  }
  if (post.statusCode === "SCHEDULED" && post.scheduledAt) {
    return `Zamanlandı · ${new Date(post.scheduledAt).toLocaleString("tr-TR")}`;
  }
  if (post.statusCode === "PUBLISHED") {
    return `Yayınlandı · ${channels}`;
  }
  return `${STATUS_LABEL[post.statusCode] ?? post.statusCode} · ${channels}`;
}

export function postStatusBadgeClass(statusCode: string): string {
  switch (statusCode) {
    case "PUBLISHED":
      return "social-hub-status-badge social-hub-status-badge--ok";
    case "FAILED":
    case "CANCELLED":
      return "social-hub-status-badge social-hub-status-badge--error";
    case "PENDING_APPROVAL":
    case "PUBLISHING":
      return "social-hub-status-badge social-hub-status-badge--pending";
    default:
      return "social-hub-status-badge social-hub-status-badge--muted";
  }
}

export type BuildPublishingOpsLogInput = {
  posts: SocialHubPost[];
  permissions: SocialHubPermissions;
  ownerApprovalRequired: boolean;
  publishingEnabled?: boolean;
  integrationOpsHints?: SocialHubSnapshot["integrationOpsHints"];
  platformLabelByCode: (code: string) => string;
};

export function buildPublishingOpsLog(
  input: BuildPublishingOpsLogInput,
): SocialHubOpsLogEntry[] {
  const {
    posts,
    permissions,
    ownerApprovalRequired,
    publishingEnabled,
    integrationOpsHints,
    platformLabelByCode,
  } = input;
  const entries: SocialHubOpsLogEntry[] = [];

  push(entries, {
    level: "info",
    channel: "Yayın",
    message:
      "Taslak, onay, zamanlama ve Meta Graph yayını (metin + görsel). Zamanı gelen gönderiler sunucuda otomatik denenir; sonuç ve API hataları bu günlükte.",
  });
  push(entries, {
    level: "info",
    channel: "UTM",
    message:
      "Yayın taslağında utm_campaign girildiğinde metindeki bağlantılara yayın anında utm_* eklenir; Analitik sekmesinde son 30 gün kampanya sayıları görünür.",
  });
  push(entries, {
    level: "info",
    channel: "Kampanya",
    message:
      "Ekip → Firma ayarları: kampanya landing URL + taslak UTM ile yayında otomatik 🔗 satırı (Telegram Ads paneli değil).",
  });
  push(entries, {
    level: "info",
    channel: "Telegram",
    message:
      "Kanal yayını: Sosyal Hub taslakta 2–4 görsel/video + TELEGRAM seçiliyse sendMediaGroup ile kanala albüm gider.",
  });

  if (ownerApprovalRequired) {
    push(entries, {
      level: "info",
      channel: "Onay",
      message:
        "Firma ayarı: yayınlar için sahip / sosyal yönetici onayı gerekli.",
    });
  }

  if (publishingEnabled === false) {
    push(entries, {
      level: "warn",
      channel: "Yayın",
      message: "Firma ayarında yayınlama kapalı.",
    });
  }

  if (!permissions.canPublish && !permissions.canSubmitForApproval) {
    push(entries, {
      level: "warn",
      channel: "Yetki",
      message: "Yayınlama yetkisi yok (rol / firma ayarı).",
    });
  }

  if (integrationOpsHints) {
    push(entries, {
      level: "info",
      channel: "Webhook",
      message: `Gelen dedup: ${integrationOpsHints.webhookInboundDedupSeconds}s · köprü denetimi: ${
        integrationOpsHints.webhookBridgeAuditEnabled ? "açık" : "kapalı"
      }`,
    });
    if (integrationOpsHints.tiktokSignatureRequired) {
      push(entries, {
        level: "info",
        channel: "TikTok",
        message: "Webhook imza doğrulaması gerekli.",
      });
    }
    if (integrationOpsHints.youtubePushAuthRequired) {
      push(entries, {
        level: "info",
        channel: "YouTube",
        message: "Push auth / imza gerekli.",
      });
    }
  }

  for (const post of posts) {
    const labels = post.platformCodes.map(platformLabelByCode);
    const status = STATUS_LABEL[post.statusCode] ?? post.statusCode;
    const level =
      post.statusCode === "FAILED"
        ? "error"
        : post.statusCode === "PENDING_APPROVAL"
          ? "warn"
          : "info";
    const parts = [
      status,
      labels.join(", ") || post.platformCodes.join(", "),
      `id ${post.id.slice(0, 8)}…`,
    ];
    if (post.scheduledAt) {
      parts.push(`zaman: ${new Date(post.scheduledAt).toLocaleString("tr-TR")}`);
    }
    if (post.publishedAt) {
      parts.push(`yayın: ${new Date(post.publishedAt).toLocaleString("tr-TR")}`);
    }
    if (post.externalPostId) {
      parts.push(`dış id: ${post.externalPostId}`);
    }
    if (post.mediaUrls?.length) {
      parts.push(`${post.mediaUrls.length} medya`);
    }
    push(entries, {
      level,
      channel: "Gönderi",
      message: parts.join(" · "),
    });
    if (post.lastErrorMessage?.trim()) {
      push(entries, {
        level: "error",
        channel: labels[0] ?? "Yayın",
        message: post.lastErrorMessage.trim(),
      });
    }
  }

  return entries;
}
