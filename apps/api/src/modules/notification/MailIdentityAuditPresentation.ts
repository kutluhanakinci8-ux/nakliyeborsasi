import { MailIdentityAuditAction } from "./MailIdentityAuditService";

const LABELS: Record<string, string> = {
  [MailIdentityAuditAction.CustomDomainRegistered]: "Özel domain kaydı",
  [MailIdentityAuditAction.CustomDomainDnsVerified]: "Domain DNS doğrulandı",
  [MailIdentityAuditAction.CustomDomainDnsFailed]: "Domain DNS doğrulama başarısız",
  [MailIdentityAuditAction.SenderProvisioned]: "Gönderen / posta kutusu oluşturuldu",
  [MailIdentityAuditAction.DisplayNameUpdated]: "Görünen ad güncellendi",
  [MailIdentityAuditAction.SuppressionAdded]: "Teslimat engeli eklendi",
  [MailIdentityAuditAction.SuppressionRemoved]: "Teslimat engeli kaldırıldı",
  [MailIdentityAuditAction.TenantSubdomainProvisioned]: "Kiracı alt alan adı açıldı",
  [MailIdentityAuditAction.TenantSubdomainDnsVerified]: "Kiracı DNS doğrulandı",
  [MailIdentityAuditAction.AdminDomainCreated]: "Platform domain kaydı",
  [MailIdentityAuditAction.AdminDomainDnsVerified]: "Platform DNS doğrulandı",
  [MailIdentityAuditAction.AdminDomainManuallyVerified]: "Domain manuel doğrulandı",
  [MailIdentityAuditAction.TenantSuspended]: "Hesap askıya alındı",
  [MailIdentityAuditAction.TenantUnsuspended]: "Askı kaldırıldı",
  [MailIdentityAuditAction.PrivacyDataExport]: "KVKK veri dışa aktarımı",
  [MailIdentityAuditAction.PrivacyDeletionRequested]: "KVKK silme talebi",
  [MailIdentityAuditAction.PrivacyDeletionCompleted]: "KVKK silme tamamlandı",
  [MailIdentityAuditAction.PrivacyDeletionCancelled]: "KVKK silme iptal",
  [MailIdentityAuditAction.DefaultSenderSet]: "Varsayılan gönderen değişti",
  [MailIdentityAuditAction.SubscriptionPlanSelected]: "Abonelik planı seçildi",
  [MailIdentityAuditAction.TeamInviteCreated]: "Ekip daveti gönderildi",
  [MailIdentityAuditAction.TeamInviteRevoked]: "Ekip daveti iptal edildi",
  [MailIdentityAuditAction.TeamInviteAccepted]: "Ekip daveti kabul edildi",
  [MailIdentityAuditAction.TeamMemberRoleChanged]: "Ekip rolü güncellendi",
  [MailIdentityAuditAction.TeamMemberRemoved]: "Ekip üyesi çıkarıldı",
};

function readString(metadata: Record<string, unknown> | null, key: string): string | null {
  if (!metadata) {
    return null;
  }
  const value = metadata[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function mailAuditLabelTr(actionCode: string): string {
  return LABELS[actionCode] ?? actionCode.replace(/^MAIL_/, "").replace(/_/g, " ");
}

export function mailAuditSummaryTr(
  actionCode: string,
  metadata: Record<string, unknown> | null,
): string {
  const domain = readString(metadata, "domain");
  const fromAddress = readString(metadata, "fromAddress");
  const email = readString(metadata, "email");
  const displayName = readString(metadata, "displayName");
  const planCode = readString(metadata, "planCode");
  const roleCode = readString(metadata, "roleCode");
  const reason = readString(metadata, "reason");

  switch (actionCode) {
    case MailIdentityAuditAction.CustomDomainRegistered:
      return domain ? `Domain: ${domain}` : "Yeni özel domain";
    case MailIdentityAuditAction.SenderProvisioned:
      return fromAddress ?? displayName ?? "Yeni gönderen";
    case MailIdentityAuditAction.DisplayNameUpdated:
      return displayName ? `Ad: ${displayName}` : "Görünen ad";
    case MailIdentityAuditAction.SuppressionAdded:
    case MailIdentityAuditAction.SuppressionRemoved:
      return email ? `Adres: ${email}` : "";
    case MailIdentityAuditAction.DefaultSenderSet:
      return fromAddress ?? "Varsayılan gönderen";
    case MailIdentityAuditAction.SubscriptionPlanSelected:
      return planCode ? `Plan: ${planCode}` : "Plan değişikliği";
    case MailIdentityAuditAction.TeamInviteCreated:
    case MailIdentityAuditAction.TeamInviteRevoked:
    case MailIdentityAuditAction.TeamInviteAccepted:
      return email
        ? `${email}${roleCode ? ` (${roleCode})` : ""}`
        : roleCode ?? "";
    case MailIdentityAuditAction.TeamMemberRoleChanged:
      return roleCode ? `Yeni rol: ${roleCode}` : "Rol güncellendi";
    case MailIdentityAuditAction.TeamMemberRemoved:
      return email ?? "Üye çıkarıldı";
    case MailIdentityAuditAction.TenantSuspended:
      return reason ?? "Operatör askısı";
    case MailIdentityAuditAction.PrivacyDeletionRequested:
      return readString(metadata, "executeAfter")
        ? `En erken: ${readString(metadata, "executeAfter")}`
        : "Silme talebi";
    default:
      return domain ?? fromAddress ?? email ?? "";
  }
}
