import { SOCIAL_HUB_TEMPLATE_VARIABLE_HINTS } from "./socialHubTemplateRender";
import type { SocialHubOpsLogEntry } from "./socialHubConnectionsOpsLog";
import type {
  SocialHubPermissions,
  SocialHubTemplate,
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

export function templatesPanelLead(count: number): string {
  if (count === 0) {
    return "Sık kullandığınız yanıtları kaydedin; Mesajlar’da tek tıkla kullanın.";
  }
  if (count === 1) {
    return "1 kayıtlı şablon — Mesajlar’da hızlı yanıt olarak seçilebilir.";
  }
  return `${count} kayıtlı şablon — Mesajlar’da hızlı yanıt olarak seçilebilir.`;
}

export function templateCardSummary(template: SocialHubTemplate): string {
  const scope =
    template.channelScopeLabel?.trim() ||
    template.channelScopeCode?.trim() ||
    "Tüm kanallar";
  return `${scope} · ${template.bodyText.length} karakter`;
}

export type BuildTemplatesOpsLogInput = {
  templates: SocialHubTemplate[];
  permissions: SocialHubPermissions;
  serverPreview: string | null;
  draftBody: string;
};

export function buildTemplatesOpsLog(
  input: BuildTemplatesOpsLogInput,
): SocialHubOpsLogEntry[] {
  const { templates, permissions, serverPreview, draftBody } = input;
  const entries: SocialHubOpsLogEntry[] = [];

  push(entries, {
    level: "info",
    channel: "Şablon",
    message:
      "{{degisken}} yer tutucuları kişiselleştirme için kullanılır; kayıtlı şablonlar Mesajlar’da hızlı yanıt olarak görünür. Değişkenler gönderim anında çözülür.",
  });

  for (const hint of SOCIAL_HUB_TEMPLATE_VARIABLE_HINTS) {
    push(entries, {
      level: "info",
      channel: "Değişken",
      message: `${hint.placeholder} — ${hint.description}`,
    });
  }

  if (!permissions.canManageTemplates) {
    push(entries, {
      level: "warn",
      channel: "Yetki",
      message: "Şablon oluşturma/düzenleme yetkisi yok (rol / firma ayarı).",
    });
  }

  if (draftBody.trim() && serverPreview) {
    push(entries, {
      level: "info",
      channel: "Önizleme",
      message: `Sunucu önizleme: ${serverPreview}`,
    });
  }

  for (const template of templates) {
    push(entries, {
      level: "info",
      channel: template.title,
      message: `Kapsam: ${
        template.channelScopeLabel ??
        template.channelScopeCode ??
        "tüm kanallar"
      } · sıra ${template.sortOrder}`,
    });
    push(entries, {
      level: "info",
      channel: template.title,
      message: `Ham metin: ${template.bodyText}`,
    });
  }

  return entries;
}
