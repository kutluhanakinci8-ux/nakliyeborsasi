import type { SocialHubOpsLogEntry } from "./socialHubConnectionsOpsLog";
import type {
  SocialHubInboxThreadPreview,
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

export function inboxPanelLead(totalOpenThreads: number): string {
  if (totalOpenThreads === 0) {
    return "Sosyal kanallardan gelen konuşmalar Mesajlar’da birleşir. Kanal bağlayın veya demo ile deneyin.";
  }
  if (totalOpenThreads === 1) {
    return "1 açık sosyal konuşma — önizlemeden veya Mesajlar’dan yanıtlayın.";
  }
  return `${totalOpenThreads} açık sosyal konuşma — önizlemeden veya Mesajlar’dan yanıtlayın.`;
}

export function inboxPlatformSummary(openCount: number): string {
  if (openCount === 0) {
    return "Bu kanalda açık konuşma yok.";
  }
  if (openCount === 1) {
    return "1 açık konuşma.";
  }
  return `${openCount} açık konuşma.`;
}

export type BuildInboxOpsLogInput = {
  snapshot: SocialHubSnapshot;
  threadsPreview: SocialHubInboxThreadPreview[];
};

export function buildInboxOpsLog(input: BuildInboxOpsLogInput): SocialHubOpsLogEntry[] {
  const { snapshot, threadsPreview } = input;
  const entries: SocialHubOpsLogEntry[] = [];
  const inboxSummary = snapshot.inboxSummary;

  push(entries, {
    level: "info",
    channel: "Gelen kutusu",
    message: inboxSummary?.note?.trim() || "Sosyal konuşmalar Mesajlar listesinde listelenir.",
  });

  if (snapshot.linkedinDmInboxGate?.userFacingNote?.trim()) {
    push(entries, {
      level: "info",
      channel: snapshot.linkedinDmInboxGate.userFacingLabel,
      message: snapshot.linkedinDmInboxGate.userFacingNote.trim(),
    });
  }

  if ((inboxSummary?.webhookInboundBridged24h ?? 0) > 0) {
    push(entries, {
      level: "info",
      channel: "Webhook",
      message: `Toplam webhook köprü (24s): ${inboxSummary!.webhookInboundBridged24h}`,
    });
  }

  for (const row of inboxSummary?.byPlatform ?? []) {
    const webhook = row.webhookInboundBridged24h ?? 0;
    const parts = [
      `${row.openCount} açık konuşma`,
      `durum: ${row.implementationStatus}`,
    ];
    if (webhook > 0) {
      parts.push(`webhook köprü (24s): ${webhook}`);
    }
    push(entries, {
      level: row.openCount > 0 ? "info" : "warn",
      channel: row.platformCode,
      message: parts.join(" · "),
    });
  }

  const sync = snapshot.inboxSyncSummary;
  if (sync?.channels?.length) {
    push(entries, {
      level: "info",
      channel: "Sync",
      message: `Kanal sync özeti — ${new Date(sync.generatedAt).toLocaleString("tr-TR")}`,
    });
    for (const row of sync.channels) {
      const meta: string[] = [
        `${row.openCount} açık`,
        `webhook ${row.webhookInboundBridged24h} (24s)`,
      ];
      if (row.dmInboxGateLabel) {
        meta.push(row.dmInboxGateLabel);
      } else if (row.inboxHistorySync) {
        meta.push("Geçmiş sync destekli");
      } else if (row.inboxWebhook) {
        meta.push("Webhook gelen kutusu");
      } else {
        meta.push("Yayın / özet");
      }
      if (row.connectionStatusCode) {
        meta.push(`bağlantı ${row.connectionStatusCode}`);
      }
      push(entries, {
        level:
          row.connectionStatusCode === "CONNECTED" ? "info" : "warn",
        channel: row.label,
        message: meta.join(" · "),
      });
      if (row.lastSyncAt) {
        push(entries, {
          level: "info",
          channel: row.label,
          message: `Son sync: ${new Date(row.lastSyncAt).toLocaleString("tr-TR")}${
            row.lastSyncImplementationStatus
              ? ` (${row.lastSyncImplementationStatus})`
              : ""
          }`,
        });
      } else if (
        row.connectionStatusCode === "CONNECTED" &&
        row.inboxHistorySync
      ) {
        push(entries, {
          level: "warn",
          channel: row.label,
          message:
            "Henüz sync kaydı yok — «senkron» ile deneyin veya OAuth sonrası otomatik sync bekleyin.",
        });
      } else {
        push(entries, {
          level: "info",
          channel: row.label,
          message: "Henüz sync denemesi kaydı yok.",
        });
      }
      if (row.lastSyncMessage?.trim()) {
        push(entries, {
          level: row.lastSyncImplementationStatus === "pending" ? "warn" : "info",
          channel: row.label,
          message: row.lastSyncMessage.trim(),
        });
      }
      if (row.providerImplementationStatus === "pending") {
        push(entries, {
          level: "warn",
          channel: row.label,
          message: "Sağlayıcı implementasyonu: pending",
        });
      }
    }
  }

  for (const row of threadsPreview.slice(0, 12)) {
    push(entries, {
      level: "info",
      channel: row.platformLabel,
      message: `${row.displayLabel}${row.unreadCount > 0 ? ` · ${row.unreadCount} okunmamış` : ""}${
        row.lastMessageAt
          ? ` · ${new Date(row.lastMessageAt).toLocaleString("tr-TR")}`
          : ""
      }`,
    });
  }

  if (!snapshot.settings.kvkkAcceptedAt) {
    push(entries, {
      level: "warn",
      channel: "KVKK",
      message:
        "Demo veya senkron için Ekip & izinler sekmesinden KVKK onayı gerekir.",
    });
  }

  return entries;
}
