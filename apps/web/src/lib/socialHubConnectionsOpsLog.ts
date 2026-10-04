import type {
  SocialHubIntegrationGate,
  SocialHubRoadmapProvider,
  SocialHubSnapshot,
} from "./socialHubTypes";

export type SocialHubOpsLogLevel = "info" | "warn" | "error";

export type SocialHubOpsLogEntry = {
  id: string;
  level: SocialHubOpsLogLevel;
  channel?: string;
  message: string;
};

function push(
  entries: SocialHubOpsLogEntry[],
  entry: Omit<SocialHubOpsLogEntry, "id"> & { id?: string },
): void {
  const id =
    entry.id ??
    `${entry.channel ?? "sys"}-${entries.length}-${entry.message.slice(0, 24)}`;
  entries.push({ ...entry, id });
}

function gateEntries(
  gate: SocialHubIntegrationGate,
  entries: SocialHubOpsLogEntry[],
): void {
  push(entries, {
    level: "info",
    channel: "Entegrasyon",
    message: gate.note,
  });
  push(entries, {
    level: "info",
    channel: "Entegrasyon",
    message: `Otomatik adımlar: ${gate.automatedReadyCount}/${gate.automatedStepCount}${
      gate.allAutomatedReady ? " (tümü hazır)" : ""
    }`,
  });
  for (const step of gate.steps) {
    const level =
      step.status === "ready"
        ? "info"
        : step.status === "partial"
          ? "warn"
          : step.status === "pending"
            ? "warn"
            : "info";
    push(entries, {
      level,
      channel: `Kapı ${step.code}`,
      message: `${step.title} — ${step.detail}`,
    });
  }
}

function roadmapEntries(
  row: SocialHubRoadmapProvider,
  entries: SocialHubOpsLogEntry[],
): void {
  if (row.roadmapNote?.trim()) {
    push(entries, {
      level: "info",
      channel: row.label,
      message: row.roadmapNote.trim(),
    });
  }
  if (row.xDmInboxGate?.userFacingNote?.trim()) {
    push(entries, {
      level: "info",
      channel: row.label,
      message: row.xDmInboxGate.userFacingNote.trim(),
    });
  }
  const oauthLine = row.isPendingSkeleton
    ? "OAuth kapalı (pending provider)"
    : row.oauthImplementationStatus === "ready" ||
        (row.oauthEnvConfigured && row.isRoadmapBeta === false)
      ? "Sunucu OAuth hazır — bağlanabilir"
      : row.oauthEnvConfigured
        ? "Ortam değişkenleri tanımlı (entegrasyon sırada)"
        : "Platform OAuth henüz yapılandırılmadı";
  push(entries, {
    level: row.oauthEnvConfigured ? "info" : "warn",
    channel: row.label,
    message: `Platform OAuth: ${oauthLine}`,
  });
  const caps: string[] = [];
  if (row.capabilities?.inboxWebhook) {
    caps.push("Gelen webhook");
  }
  if (row.capabilities?.outboundMessaging) {
    caps.push("Giden mesaj");
  }
  if (row.capabilities?.feedPublish) {
    caps.push("Feed yayını");
  }
  if (row.capabilities?.inboxHistorySync) {
    caps.push("Geçmiş sync");
  }
  if (caps.length > 0) {
    push(entries, {
      level: "info",
      channel: row.label,
      message: `Desteklenen özellikler: ${caps.join(", ")}`,
    });
  }
}

export function buildConnectionsOpsLog(
  snapshot: SocialHubSnapshot,
): SocialHubOpsLogEntry[] {
  const entries: SocialHubOpsLogEntry[] = [];
  const connections = snapshot.connections ?? [];
  const providers = snapshot.providers ?? [];
  const metaOauthReady = connections.some(
    (row) =>
      row.oauthReady &&
      (row.platformCode === "INSTAGRAM" ||
        row.platformCode === "FACEBOOK_MESSENGER" ||
        row.platformCode === "WHATSAPP_CLOUD"),
  );

  if (metaOauthReady) {
    push(entries, {
      level: "info",
      channel: "Meta",
      message:
        "Lerta sunucusu hazır (E1). Bağlantı Meta Developer uygulama tipine bağlıdır; yalnızca «Facebook Login» ile oluşturulan uygulamada Instagram, Messenger ve WhatsApp izinleri Invalid Scopes verebilir.",
    });
    push(entries, {
      level: "info",
      channel: "Meta",
      message:
        "WhatsApp: use case «Connect with customers through WhatsApp» veya WhatsApp ürünü gerekir.",
    });
    push(entries, {
      level: "info",
      channel: "Meta",
      message:
        "Messenger: use case «Engage with customers on Messenger» gerekir (pages_* izinleri).",
    });
    push(entries, {
      level: "info",
      channel: "Meta",
      message:
        "Instagram DM: Messenger veya Instagram izinleri + ilgili use case; tek başına Facebook Login yetmez.",
    });
    push(entries, {
      level: "info",
      channel: "Meta",
      message:
        "Öneri: WABA için Business Manager’da yeni Meta uygulaması; önce WhatsApp use case. App ID/Secret değişince VPS .env güncellenmeli.",
    });
  }

  for (const row of connections) {
    const provider = providers.find((p) => p.platformCode === row.platformCode);
    const channel = row.label;
    if (row.linkedinDmInboxGate?.userFacingNote?.trim()) {
      push(entries, {
        level: "info",
        channel,
        message: `${row.linkedinDmInboxGate.userFacingLabel}: ${row.linkedinDmInboxGate.userFacingNote.trim()}`,
      });
    }
    if (provider?.implementationStatus === "pending" || row.oauthReady === false) {
      push(entries, {
        level: "warn",
        channel,
        message: "OAuth yapılandırması eksik (sunucu tarafı).",
      });
    }
    const caps: string[] = [];
    const capsSrc = row.capabilities ?? provider?.capabilities;
    if (capsSrc?.inboxWebhook) {
      caps.push("Gelen webhook");
    }
    if (capsSrc?.outboundMessaging) {
      caps.push("Giden mesaj");
    }
    if (capsSrc?.feedPublish) {
      caps.push("Feed yayını");
    }
    if (capsSrc?.inboxHistorySync) {
      caps.push("Geçmiş sync");
    }
    if (caps.length > 0) {
      push(entries, {
        level: "info",
        channel,
        message: `Özellikler: ${caps.join(", ")}. Canlı durum için Gelen kutusu / Sağlık sekmelerine bakın.`,
      });
    }
    for (const warning of row.setupWarnings ?? []) {
      push(entries, {
        level: "warn",
        channel,
        message: warning,
      });
    }
    if (row.lastErrorMessage?.trim()) {
      push(entries, {
        level: "error",
        channel,
        message: row.lastErrorMessage.trim(),
      });
    }
  }

  for (const row of snapshot.roadmapProviders ?? []) {
    roadmapEntries(row, entries);
  }

  if (snapshot.integrationGate) {
    gateEntries(snapshot.integrationGate, entries);
  }

  return entries;
}

export function connectionUserSummary(
  statusCode: string,
  hasWarnings: boolean,
  hasError: boolean,
): string {
  if (hasError) {
    return "Bağlantıda sorun var — günlükteki son hataya bakın.";
  }
  if (statusCode === "CONNECTED") {
    return hasWarnings
      ? "Bağlı; küçük bir ayar önerisi var (günlük)."
      : "Hazır — mesajlar ve yayınlar için kullanılabilir.";
  }
  if (statusCode === "PENDING_OAUTH") {
    return "Bağlantıyı tamamlamak için «Bağla»ya tıklayın.";
  }
  if (statusCode === "TOKEN_EXPIRED") {
    return "Oturum süresi doldu — yeniden bağlanın.";
  }
  if (statusCode === "ERROR") {
    return "Bağlanamadı — günlükteki hatayı kontrol edin.";
  }
  return "Henüz bağlı değil — «Bağla» ile başlayın.";
}
