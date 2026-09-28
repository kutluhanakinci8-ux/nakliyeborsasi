export type MailInboxRuleConditionGroup = {
  matchAny: boolean;
  fromContains?: string | null;
  subjectContains?: string | null;
  toContains?: string | null;
  bodyContains?: string | null;
  requireAttachment?: boolean;
  minAttachmentBytes?: number | null;
  maxAttachmentBytes?: number | null;
};

export type MailInboxRuleConditionGroups = {
  matchAnyBetweenGroups: boolean;
  groups: MailInboxRuleConditionGroup[];
};

export const MAX_INBOX_RULE_CONDITION_GROUPS = 5;
const MAX_GROUPS = MAX_INBOX_RULE_CONDITION_GROUPS;

export function parseConditionGroupsJson(
  raw: string | null,
): MailInboxRuleConditionGroups | null {
  if (!raw?.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as MailInboxRuleConditionGroups;
    if (!parsed.groups || !Array.isArray(parsed.groups)) {
      return null;
    }
    return normalizeConditionGroups(parsed);
  } catch {
    return null;
  }
}

export function serializeConditionGroups(
  groups: MailInboxRuleConditionGroups | null,
): string | null {
  if (!groups) {
    return null;
  }
  const normalized = normalizeConditionGroups(groups);
  if (normalized.groups.length === 0) {
    return null;
  }
  return JSON.stringify(normalized);
}

function normalizeConditionGroups(
  input: MailInboxRuleConditionGroups,
): MailInboxRuleConditionGroups {
  const groups = input.groups.slice(0, MAX_GROUPS).map((g) => ({
    matchAny: Boolean(g.matchAny),
    fromContains: trimOrNull(g.fromContains),
    subjectContains: trimOrNull(g.subjectContains),
    toContains: trimOrNull(g.toContains),
    bodyContains: trimOrNull(g.bodyContains),
    requireAttachment: Boolean(g.requireAttachment),
    minAttachmentBytes: normalizeByteLimit(g.minAttachmentBytes),
    maxAttachmentBytes: normalizeByteLimit(g.maxAttachmentBytes),
  }));
  return {
    matchAnyBetweenGroups: Boolean(input.matchAnyBetweenGroups),
    groups,
  };
}

function trimOrNull(value?: string | null): string | null {
  const t = value?.trim() ?? "";
  return t.length > 0 ? t : null;
}

function normalizeByteLimit(value?: number | null): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return null;
  }
  return Math.floor(n);
}

export function groupHasAnyCondition(group: MailInboxRuleConditionGroup): boolean {
  return Boolean(
    group.fromContains ||
      group.subjectContains ||
      group.toContains ||
      group.bodyContains ||
      group.requireAttachment ||
      group.minAttachmentBytes != null ||
      group.maxAttachmentBytes != null,
  );
}

export function conditionGroupsAreValid(
  groups: MailInboxRuleConditionGroups,
): boolean {
  const active = groups.groups.filter(groupHasAnyCondition);
  return active.length > 0;
}

function describeGroupConditions(group: MailInboxRuleConditionGroup): string {
  const parts: string[] = [];
  if (group.fromContains) {
    parts.push(`gönderen “${group.fromContains}”`);
  }
  if (group.subjectContains) {
    parts.push(`konu “${group.subjectContains}”`);
  }
  if (group.toContains) {
    parts.push(`alıcı “${group.toContains}”`);
  }
  if (group.bodyContains) {
    parts.push(`gövde “${group.bodyContains}”`);
  }
  if (group.requireAttachment) {
    parts.push("ek var");
  }
  if (group.minAttachmentBytes != null) {
    parts.push(`ek ≥ ${group.minAttachmentBytes} B`);
  }
  if (group.maxAttachmentBytes != null) {
    parts.push(`ek ≤ ${group.maxAttachmentBytes} B`);
  }
  const joined = parts.join(group.matchAny ? " VEYA " : " VE ");
  return group.matchAny ? `(${joined})` : joined;
}

export function describeInboxRuleMatchLogic(input: {
  fromContains: string | null;
  subjectContains: string | null;
  toContains: string | null;
  requireAttachment: boolean;
  matchAnyCondition: boolean;
  conditionGroupsJson: string | null;
}): string {
  const groups = parseConditionGroupsJson(input.conditionGroupsJson);
  if (groups && conditionGroupsAreValid(groups)) {
    const active = groups.groups.filter(groupHasAnyCondition);
    const between = groups.matchAnyBetweenGroups ? " VEYA " : " VE ";
    return `Gruplar: ${active.map(describeGroupConditions).join(between)}`;
  }
  const parts: string[] = [];
  if (input.fromContains) {
    parts.push(`gönderen “${input.fromContains}”`);
  }
  if (input.subjectContains) {
    parts.push(`konu “${input.subjectContains}”`);
  }
  if (input.toContains) {
    parts.push(`alıcı “${input.toContains}”`);
  }
  if (input.requireAttachment) {
    parts.push("ek var");
  }
  if (parts.length === 0) {
    return "Koşul tanımlı değil.";
  }
  const joiner = input.matchAnyCondition ? " VEYA " : " VE ";
  return `Koşullar: ${parts.join(joiner)}`;
}
