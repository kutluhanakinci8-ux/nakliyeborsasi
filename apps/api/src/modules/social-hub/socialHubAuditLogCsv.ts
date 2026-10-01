export type SocialHubAuditLogCsvRow = {
  id: string;
  actionCode: string;
  requestPath: string;
  createdAt: string;
  metadata: Record<string, unknown> | null;
};

export function buildSocialHubAuditLogCsv(
  entries: SocialHubAuditLogCsvRow[],
  focus: "all" | "webhook",
): string {
  const header =
    "id,actionCode,requestPath,createdAt,platformCode,externalThreadId,externalMessageId";
  const lines = entries.map((entry) => {
    const meta = entry.metadata ?? {};
    const platformCode =
      typeof meta.platformCode === "string" ? meta.platformCode : "";
    const externalThreadId =
      typeof meta.externalThreadId === "string" ? meta.externalThreadId : "";
    const externalMessageId =
      typeof meta.externalMessageId === "string" ? meta.externalMessageId : "";
    return [
      entry.id,
      entry.actionCode,
      escapeCsv(entry.requestPath),
      entry.createdAt,
      escapeCsv(platformCode),
      escapeCsv(externalThreadId),
      escapeCsv(externalMessageId),
    ].join(",");
  });
  const metaLine = `# focus,${focus}`;
  return [metaLine, header, ...lines].join("\n");
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
