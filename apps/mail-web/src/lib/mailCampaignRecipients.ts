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
