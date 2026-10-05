import type { SocialHubOpsLogEntry } from "./socialHubConnectionsOpsLog";
import type {
  SocialHubHealth,
  SocialHubHealthChannel,
  SocialHubNotificationInsights,
  SocialHubOutboundDelivery,
  SocialHubPwaConfig,
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

function formatInsightTime(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  return new Date(iso).toLocaleString("tr-TR");
}

function channelMetricLines(channel: SocialHubHealthChannel): string[] {
  const lines: string[] = [
    `Açık konuşma: ${channel.openThreadCount}`,
    `24s giden hata: ${channel.recentOutboundFailures24h}`,
  ];
  if (channel.inboxWebhookCapable) {
    lines.push(
      `Webhook köprü (24s): ${channel.webhookInboundBridged24h ?? 0}`,
    );
  }
  if (channel.tokenExpiresAt) {
    lines.push(
      `Token bitiş: ${new Date(channel.tokenExpiresAt).toLocaleString("tr-TR")}`,
    );
  }
  if (!channel.oauthServerReady) {
    lines.push("Sunucu OAuth yapılandırması eksik.");
  }
  return lines;
}

export function healthChannelUserSummary(channel: SocialHubHealthChannel): string {
  if (channel.statusCode === "DISCONNECTED" || channel.tokenHealth === "missing") {
    return "Bağlı değil — Bağlı hesaplar sekmesinden bağlayın.";
  }
  if (channel.tokenHealth === "expired" || channel.statusCode === "TOKEN_EXPIRED") {
    return "Oturum süresi doldu — token yenileyin veya yeniden bağlanın.";
  }
  if (channel.recentOutboundFailures24h > 0) {
    return `Son 24 saatte ${channel.recentOutboundFailures24h} gönderim hatası — ayrıntılar günlükte.`;
  }
  if ((channel.setupWarnings?.length ?? 0) > 0) {
    return "Bağlı; küçük bir kurulum notu var (günlük).";
  }
  if (channel.tokenHealth === "expiring_soon") {
    return "Bağlantı aktif — oturumun süresi yakında dolacak.";
  }
  if (channel.statusCode === "CONNECTED") {
    return "Gönderim ve bağlantı normal görünüyor.";
  }
  if (channel.statusCode === "ERROR") {
    return "Kanalda sorun var — günlükteki uyarılara bakın.";
  }
  return "Durum güncelleniyor.";
}

export function healthTokenBadgeLabel(
  tokenHealth: SocialHubHealthChannel["tokenHealth"],
): string {
  switch (tokenHealth) {
    case "ok":
      return "Oturum aktif";
    case "expiring_soon":
      return "Süre yakın";
    case "expired":
      return "Süre doldu";
    case "missing":
      return "Bağlı değil";
    default:
      return tokenHealth;
  }
}

export type BuildHealthOpsLogInput = {
  health: SocialHubHealth;
  notificationInsights: SocialHubNotificationInsights | null;
  deliveries: SocialHubOutboundDelivery[];
  pwa?: SocialHubPwaConfig;
  healthPushHookStatus?: string;
};

export function buildHealthOpsLog(input: BuildHealthOpsLogInput): SocialHubOpsLogEntry[] {
  const { health, notificationInsights, deliveries, pwa, healthPushHookStatus } =
    input;
  const entries: SocialHubOpsLogEntry[] = [];

  push(entries, {
    level: "info",
    channel: "Sağlık",
    message:
      "Token durumu, kurulum uyarıları ve son 24 saatteki kanal gönderim hataları bu günlükte toplanır. Kritik durumda firma sahiplerine e-posta gider.",
  });
  push(entries, {
    level: "info",
    channel: "Slack",
    message:
      "Slack için sosyal hub webhook URL’si veya (isteğe bağlı) Mesajlar köprüsü kullanılır. Gelişmiş ayarlar ana ekranda «Bildirim ayarları» altında.",
  });

  if (pwa) {
    push(entries, {
      level: "info",
      channel: "PWA",
      message: `Manifest: ${pwa.manifestPath} · scope ${pwa.scope}. ${pwa.healthPushHook.note}`,
    });
    if (healthPushHookStatus === "skeleton_registered") {
      push(entries, {
        level: "info",
        channel: "Push",
        message: "Push iskeleti: tarayıcı hazır.",
      });
    } else if (healthPushHookStatus === "unsupported") {
      push(entries, {
        level: "warn",
        channel: "Push",
        message: "Push: tarayıcı desteklemiyor.",
      });
    }
  }

  push(entries, {
    level: "info",
    channel: "Sağlık",
    message: `Özet üretim zamanı: ${new Date(health.generatedAt).toLocaleString("tr-TR")}`,
  });

  if (notificationInsights) {
    if (notificationInsights.manualNotifyCooldownMinutes > 0) {
      push(entries, {
        level: "info",
        channel: "Bildirim",
        message: `Manuel Slack özet ve haftalık e-posta için ${notificationInsights.manualNotifyCooldownMinutes} dakikalık bekleme uygulanır.`,
      });
    }
    push(entries, {
      level:
        notificationInsights.outboundDeliveriesLast24h.failed > 0
          ? "warn"
          : "info",
      channel: "24s gönderim",
      message: `${notificationInsights.outboundDeliveriesLast24h.ok} başarılı · ${notificationInsights.outboundDeliveriesLast24h.failed} hatalı`,
    });
    if ((notificationInsights.webhookInboundBridged24h ?? 0) > 0) {
      const byPlatform = (
        notificationInsights.webhookInboundBridgedByPlatform24h ?? []
      )
        .map((row) => `${row.label}: ${row.inboundBridged24h}`)
        .join(", ");
      push(entries, {
        level: "info",
        channel: "Webhook",
        message: `Köprü (24s): ${notificationInsights.webhookInboundBridged24h}${byPlatform ? ` (${byPlatform})` : ""}`,
      });
    }
    push(entries, {
      level: "info",
      channel: "E-posta",
      message: `Sağlık uyarısı son: ${formatInsightTime(notificationInsights.healthAlertEmailLastSentAt)}${
        notificationInsights.lastHealthAlertStatus
          ? ` (${notificationInsights.lastHealthAlertStatus})`
          : ""
      }`,
    });
    push(entries, {
      level: "info",
      channel: "Slack",
      message: `Günlük özet son: ${formatInsightTime(notificationInsights.slackDailyDigestLastSentAt)}`,
    });
    push(entries, {
      level: "info",
      channel: "Slack",
      message: `Sağlık uyarısı son: ${formatInsightTime(notificationInsights.slackHealthAlertLastSentAt)}`,
    });
    push(entries, {
      level: "info",
      channel: "Slack",
      message: `Gönderim hatası bildirimi son: ${formatInsightTime(notificationInsights.slackOutboundFailureLastSentAt)}`,
    });
    push(entries, {
      level: "info",
      channel: "E-posta",
      message: `Haftalık özet son: ${formatInsightTime(notificationInsights.weeklyEmailLastSentAt)}`,
    });
    if (notificationInsights.roadmapInterestLabels.length > 0) {
      push(entries, {
        level: "info",
        channel: "Yol haritası",
        message: `Öncelik bildirimi: ${notificationInsights.roadmapInterestLabels.join(", ")}`,
      });
    }
    for (const row of notificationInsights.channelOutbound24h) {
      push(entries, {
        level: row.failed > 0 ? "warn" : "info",
        channel: row.label,
        message: `24s başarı: %${row.successRatePercent} (${row.ok}/${row.ok + row.failed})`,
      });
    }
    for (const row of notificationInsights.roadmapBetaOutbound24h ?? []) {
      push(entries, {
        level: "info",
        channel: `${row.label} (beta)`,
        message: `24s başarı: %${row.successRatePercent} (${row.ok}/${row.ok + row.failed})`,
      });
    }
    for (const row of notificationInsights.roadmapBetaChannelHealth ?? []) {
      if (row.statusCode !== "CONNECTED") {
        continue;
      }
      push(entries, {
        level: "info",
        channel: `${row.label} (beta)`,
        message: `${row.openThreadCount} açık konuşma · ${row.recentOutboundFailures24h} giden hata (24s) · webhook ${row.webhookInboundBridged24h ?? 0} (24s)`,
      });
    }
    push(entries, {
      level: "info",
      channel: "7 gün",
      message: `${notificationInsights.outboundDeliveriesLast7d.ok} başarılı · ${notificationInsights.outboundDeliveriesLast7d.failed} hatalı`,
    });
    push(entries, {
      level: "info",
      channel: "30 gün",
      message: `${notificationInsights.outboundDeliveriesLast30d.ok} başarılı · ${notificationInsights.outboundDeliveriesLast30d.failed} hatalı`,
    });
  }

  const allChannels = [
    ...health.channels,
    ...(health.roadmapChannels ?? []),
  ];
  for (const channel of allChannels) {
    const level =
      channel.recentOutboundFailures24h > 0 ||
      channel.tokenHealth === "expired" ||
      channel.statusCode === "ERROR"
        ? "warn"
        : channel.tokenHealth === "expiring_soon"
          ? "warn"
          : "info";
    push(entries, {
      level,
      channel: channel.label,
      message: channelMetricLines(channel).join(" · "),
    });
    for (const warning of channel.setupWarnings ?? []) {
      push(entries, {
        level: "warn",
        channel: channel.label,
        message: warning,
      });
    }
  }

  for (const row of deliveries) {
    if (row.status !== "failed" || !row.errorMessage?.trim()) {
      continue;
    }
    push(entries, {
      level: "error",
      channel: row.platformLabel,
      message: `${new Date(row.createdAt).toLocaleString("tr-TR")}: ${row.errorMessage.trim()}`,
    });
  }

  push(entries, {
    level: "info",
    channel: "Eşikler",
    message:
      "Kanal bazlı eşik JSON örneği: {\"WHATSAPP_CLOUD\":3,\"TIKTOK\":2,\"YOUTUBE\":2} — TIKTOK, YOUTUBE ve yol haritası kodları.",
  });

  return entries;
}
