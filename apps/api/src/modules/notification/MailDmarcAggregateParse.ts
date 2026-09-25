import { BadRequestException } from "@nestjs/common";

export type ParsedDmarcAggregate = {
  domain: string;
  periodStart: Date;
  periodEnd: Date;
  reporterOrgName: string | null;
  messageCount: number;
  dispositionNone: number;
  dispositionQuarantine: number;
  dispositionReject: number;
  dkimPass: number;
  dkimFail: number;
  spfPass: number;
  spfFail: number;
};

function readTag(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}>([^<]*)</${tag}>`, "i");
  const match = block.match(re);
  return match?.[1]?.trim() ?? null;
}

function parseUnixSeconds(raw: string | null): Date | null {
  if (!raw) {
    return null;
  }
  const seconds = Number.parseInt(raw, 10);
  if (!Number.isFinite(seconds)) {
    return null;
  }
  return new Date(seconds * 1000);
}

export function parseDmarcAggregateXml(xml: string): ParsedDmarcAggregate {
  const normalized = xml.trim();
  if (!normalized.includes("<feedback")) {
    throw new BadRequestException("Geçersiz DMARC aggregate XML");
  }

  const domain =
    readTag(normalized, "domain") ??
    readTag(
      normalized.slice(
        normalized.indexOf("<policy_published>"),
        normalized.indexOf("</policy_published>") + 1,
      ),
      "domain",
    );
  if (!domain) {
    throw new BadRequestException("DMARC XML: domain bulunamadı");
  }

  const metadataBlock = normalized.match(/<report_metadata>[\s\S]*?<\/report_metadata>/i)?.[0] ?? "";
  const dateRangeBlock =
    metadataBlock.match(/<date_range>[\s\S]*?<\/date_range>/i)?.[0] ?? "";
  const periodStart =
    parseUnixSeconds(readTag(dateRangeBlock, "begin")) ?? new Date(0);
  const periodEnd =
    parseUnixSeconds(readTag(dateRangeBlock, "end")) ?? new Date();

  const reporterOrgName = readTag(metadataBlock, "org_name");

  let dispositionNone = 0;
  let dispositionQuarantine = 0;
  let dispositionReject = 0;
  let dkimPass = 0;
  let dkimFail = 0;
  let spfPass = 0;
  let spfFail = 0;
  let messageCount = 0;

  const recordBlocks = normalized.match(/<record>[\s\S]*?<\/record>/gi) ?? [];
  for (const record of recordBlocks) {
    const countRaw = readTag(record, "count");
    const count = countRaw ? Math.max(1, Number.parseInt(countRaw, 10)) : 1;
    messageCount += count;

    const policyBlock =
      record.match(/<policy_evaluated>[\s\S]*?<\/policy_evaluated>/i)?.[0] ??
      record;
    const disposition = (readTag(policyBlock, "disposition") ?? "none").toLowerCase();
    if (disposition === "quarantine") {
      dispositionQuarantine += count;
    } else if (disposition === "reject") {
      dispositionReject += count;
    } else {
      dispositionNone += count;
    }

    const dkim = (readTag(policyBlock, "dkim") ?? "fail").toLowerCase();
    if (dkim === "pass") {
      dkimPass += count;
    } else {
      dkimFail += count;
    }

    const spf = (readTag(policyBlock, "spf") ?? "fail").toLowerCase();
    if (spf === "pass") {
      spfPass += count;
    } else {
      spfFail += count;
    }
  }

  return {
    domain: domain.toLowerCase(),
    periodStart,
    periodEnd,
    reporterOrgName,
    messageCount,
    dispositionNone,
    dispositionQuarantine,
    dispositionReject,
    dkimPass,
    dkimFail,
    spfPass,
    spfFail,
  };
}
