import type { MailMarketingCampaignEntity } from "../../infrastructure/database/entities/MailMarketingCampaignEntity";

type CampaignListExportRow = {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
  scheduleAt: string | null;
  recipientCount: number;
  sent: number;
  failedCount: number;
  tags: string[];
};

export function buildCampaignListExportCsv(rows: CampaignListExportRow[]): string {
  const header =
    "kampanya_id,konu,durum,olusturma,planlanan,alici_sayisi,gonderilen,basarisiz,etiketler";
  const escape = (value: string) => {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };
  const lines = rows.map((row) =>
    [
      escape(row.id),
      escape(row.subject),
      escape(row.status),
      escape(row.createdAt),
      escape(row.scheduleAt ?? ""),
      String(row.recipientCount),
      String(row.sent),
      String(row.failedCount),
      escape(row.tags.join(";")),
    ].join(","),
  );
  return [header, ...lines].join("\n");
}

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
