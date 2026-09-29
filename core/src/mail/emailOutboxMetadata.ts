/** Outbox metadata içinden kurumsal org kimliği (MP-6 engagement filtreleri). */
export function readOrganizationIdFromOutboxMetadata(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  const raw =
    (typeof metadata?.organizationId === "string" && metadata.organizationId) ||
    (typeof metadata?.companyId === "string" && metadata.companyId) ||
    "";
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}
