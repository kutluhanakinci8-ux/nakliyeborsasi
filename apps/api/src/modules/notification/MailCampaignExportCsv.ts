import type { MailMarketingCampaignEntity } from "../../infrastructure/database/entities/MailMarketingCampaignEntity";

export function buildCampaignRecipientExportCsv(
  row: MailMarketingCampaignEntity,
  recipientStatus: Array<{
    email: string;
    musteriAdi?: string;
    referans?: string;
    status: string;
    error?: string;
  }>,
): string {
  const header = "email,musteri_adi,referans,durum,hata";
  const escape = (value: string) => {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };
  const lines = recipientStatus.map((item) =>
    [
      escape(item.email),
      escape(item.musteriAdi ?? ""),
      escape(item.referans ?? ""),
      escape(item.status),
      escape(item.error ?? ""),
    ].join(","),
  );
  const meta = [
    "",
    `# kampanya_id=${row.id}`,
    `# konu=${row.subject}`,
    `# status=${row.status}`,
    `# olusturma=${row.createdAt.toISOString()}`,
  ];
  return [header, ...lines, ...meta].join("\n");
}
