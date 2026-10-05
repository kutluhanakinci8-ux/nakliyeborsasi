import type { SocialHubOpsLogEntry } from "./socialHubConnectionsOpsLog";
import type {
  SocialHubAuditEntry,
  SocialHubPermissions,
  SocialHubSettings,
  SocialHubTeamMember,
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

const AUDIT_LABEL: Record<string, string> = {
  SOCIAL_HUB_SETTINGS_UPDATE: "Ayar güncelleme",
  SOCIAL_HUB_POST_PUBLISH: "Yayın denemesi",
  SOCIAL_HUB_POST_APPROVE: "Gönderi onayı",
  SOCIAL_HUB_POST_SUBMIT_APPROVAL: "Onaya gönderim",
  SOCIAL_HUB_MEMBER_ROLE_UPDATE: "Rol değişikliği",
  SOCIAL_HUB_WEBHOOK_INBOUND_BRIDGED: "Webhook → Mesajlar köprüsü",
  SOCIAL_HUB_ROADMAP_INBOX_SYNC: "Beta gelen kutusu özet",
  SOCIAL_HUB_INBOX_SYNC: "Gelen kutusu senkron",
};

const ROLE_LABEL: Record<string, string> = {
  SOCIAL_ADMIN: "Sosyal yönetici",
  DISPATCHER: "Dispatcher",
  VIEWER: "Görüntüleme",
  COMPANY_OWNER: "Firma sahibi",
};

const SETTING_KEYS: Array<{ key: keyof SocialHubSettings; label: string }> = [
  { key: "inboxEnabled", label: "Sosyal gelen kutusu" },
  { key: "publishingEnabled", label: "Yayınlama" },
  { key: "dispatcherCanReply", label: "Dispatcher yanıt" },
  { key: "dispatcherCanPublish", label: "Dispatcher yayın" },
  { key: "ownerApprovalRequired", label: "Sahip onayı (yayın)" },
];

export function teamPanelLead(memberCount: number, kvkkAccepted: boolean): string {
  const base =
    memberCount === 0
      ? "Ekip üyelerine sosyal hub rolleri atayın."
      : memberCount === 1
        ? "1 ekip üyesi — roller ve firma ayarlarını buradan yönetin."
        : `${memberCount} ekip üyesi — roller ve firma ayarlarını buradan yönetin.`;
  if (!kvkkAccepted) {
    return `${base} KVKK onayı demo ve senkron için gerekli.`;
  }
  return base;
}

export function memberCardSummary(member: SocialHubTeamMember): string {
  const role = ROLE_LABEL[member.roleCode] ?? member.roleCode;
  if (member.isSelf) {
    return `${role} (siz)`;
  }
  return role;
}

export type BuildTeamOpsLogInput = {
  settings: SocialHubSettings;
  permissions: SocialHubPermissions;
  members: SocialHubTeamMember[];
  auditEntries: SocialHubAuditEntry[];
  auditFocus: "all" | "webhook";
  integrationsPath: string;
};

export function buildTeamOpsLog(input: BuildTeamOpsLogInput): SocialHubOpsLogEntry[] {
  const {
    settings,
    permissions,
    members,
    auditEntries,
    auditFocus,
    integrationsPath,
  } = input;
  const entries: SocialHubOpsLogEntry[] = [];

  if (!permissions.canManageSettings) {
    push(entries, {
      level: "warn",
      channel: "Yetki",
      message:
        "Ekip ve izin ayarları yalnızca firma sahibi veya sosyal yönetici (SOCIAL_ADMIN) tarafından görüntülenir.",
    });
    return entries;
  }

  push(entries, {
    level: "info",
    channel: "Roller",
    message:
      "SOCIAL_ADMIN sosyal hub yönetimi; COMPANY_OWNER tam yetki. Rol kodları denetim ve API ile uyumludur.",
  });
  push(entries, {
    level: "info",
    channel: "Entegrasyon",
    message: `Uygulama API ve köprüler: ${integrationsPath}`,
  });

  for (const member of members) {
    push(entries, {
      level: "info",
      channel: "Ekip",
      message: `${member.displayName || member.emailAddress} · ${member.emailAddress} · rol ${
        member.roleCode
      }${member.isSelf ? " (oturum)" : ""}`,
    });
  }

  for (const row of SETTING_KEYS) {
    push(entries, {
      level: settings[row.key] ? "info" : "warn",
      channel: "Ayar",
      message: `${row.label}: ${settings[row.key] ? "açık" : "kapalı"} (${String(row.key)})`,
    });
  }

  if (settings.kvkkAcceptedAt) {
    push(entries, {
      level: "info",
      channel: "KVKK",
      message: `Onay: ${new Date(settings.kvkkAcceptedAt).toLocaleString("tr-TR")}`,
    });
  } else {
    push(entries, {
      level: "warn",
      channel: "KVKK",
      message: "Kanal kullanım onayı henüz verilmedi.",
    });
  }

  push(entries, {
    level: "info",
    channel: "Denetim",
    message: `Filtre: ${auditFocus === "webhook" ? "Webhook köprü" : "Tüm işlemler"} · ${auditEntries.length} kayıt`,
  });

  for (const entry of auditEntries) {
    const label = AUDIT_LABEL[entry.actionCode] ?? entry.actionCode;
    let meta = "";
    if (entry.metadata && typeof entry.metadata === "object") {
      const platform =
        typeof entry.metadata.platformCode === "string"
          ? entry.metadata.platformCode
          : null;
      if (platform) {
        meta = ` · ${platform}`;
      }
      const extra = JSON.stringify(entry.metadata);
      if (extra.length < 120) {
        meta += ` · ${extra}`;
      }
    }
    push(entries, {
      level: "info",
      channel: "Denetim",
      message: `${new Date(entry.createdAt).toLocaleString("tr-TR")} · ${label}${meta}`,
    });
  }

  return entries;
}
