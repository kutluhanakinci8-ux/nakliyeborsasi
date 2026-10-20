export type CampaignRecipientRow = {
  email: string;
  musteriAdi?: string;
  referans?: string;
};

const MAX_CAMPAIGN_RECIPIENTS = 25;

export function parseCampaignRecipientsText(raw: string): CampaignRecipientRow[] {
  const lines = raw
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
  const rows: CampaignRecipientRow[] = [];
  for (const line of lines) {
    const parts = line.split(/[,;]/).map((part) => part.trim());
    const email = parts[0]?.toLowerCase() ?? "";
    if (!email) {
      continue;
    }
    rows.push({
      email,
      musteriAdi: parts[1] || undefined,
      referans: parts[2] || undefined,
    });
  }
  return rows.slice(0, MAX_CAMPAIGN_RECIPIENTS);
}

export { MAX_CAMPAIGN_RECIPIENTS };

/** Basit CSV: email veya email,musteri,referans (başlık satırı atlanır). */
export function parseCampaignCsvText(raw: string): CampaignRecipientRow[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const rows: CampaignRecipientRow[] = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (
      lower.startsWith("email") ||
      lower.startsWith("e-posta") ||
      lower.startsWith("eposta")
    ) {
      continue;
    }
    const cells = line.split(/[,;\t]/).map((cell) => cell.trim().replace(/^"|"$/g, ""));
    const email = cells[0]?.toLowerCase() ?? "";
    if (!email || !email.includes("@")) {
      continue;
    }
    rows.push({
      email,
      musteriAdi: cells[1] || undefined,
      referans: cells[2] || undefined,
    });
  }
  return rows.slice(0, MAX_CAMPAIGN_RECIPIENTS);
}

export function mergeCampaignRecipientLists(
  manual: string,
  csvRows: CampaignRecipientRow[],
): string {
  const fromManual = parseCampaignRecipientsText(manual);
  const combined = [...fromManual];
  const seen = new Set(fromManual.map((r) => r.email));
  for (const row of csvRows) {
    if (seen.has(row.email)) {
      continue;
    }
    seen.add(row.email);
    combined.push(row);
  }
  return combined
    .slice(0, MAX_CAMPAIGN_RECIPIENTS)
    .map((row) => {
      if (row.musteriAdi && row.referans) {
        return `${row.email}, ${row.musteriAdi}, ${row.referans}`;
      }
      if (row.musteriAdi) {
        return `${row.email}, ${row.musteriAdi}`;
      }
      return row.email;
    })
    .join("\n");
}
