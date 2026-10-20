import type { MailMarketingCampaignSegment } from "../../infrastructure/database/entities/MailMarketingCampaignEntity";

export function recipientMatchesCampaignSegment(
  row: { referans?: string; musteriAdi?: string },
  segment?: MailMarketingCampaignSegment,
): boolean {
  if (!segment) {
    return true;
  }
  const referans = row.referans?.trim() ?? "";
  const musteriAdi = row.musteriAdi?.trim() ?? "";
  if (segment.requireMusteriAdi && !musteriAdi) {
    return false;
  }
  const prefix = segment.referansPrefix?.trim();
  if (prefix && !referans.toLowerCase().startsWith(prefix.toLowerCase())) {
    return false;
  }
  const equals = segment.referansEquals?.trim();
  if (equals && referans.toLowerCase() !== equals.toLowerCase()) {
    return false;
  }
  const allowlist = segment.referansAllowlist
    ?.map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);
  if (allowlist && allowlist.length > 0) {
    if (!referans || !allowlist.includes(referans.toLowerCase())) {
      return false;
    }
  }
  return true;
}
