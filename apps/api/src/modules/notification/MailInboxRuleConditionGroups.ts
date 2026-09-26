export type MailInboxRuleConditionGroup = {
  matchAny: boolean;
  fromContains?: string | null;
  subjectContains?: string | null;
  toContains?: string | null;
  requireAttachment?: boolean;
};

export type MailInboxRuleConditionGroups = {
  matchAnyBetweenGroups: boolean;
  groups: MailInboxRuleConditionGroup[];
};

const MAX_GROUPS = 3;

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
    requireAttachment: Boolean(g.requireAttachment),
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

export function groupHasAnyCondition(group: MailInboxRuleConditionGroup): boolean {
  return Boolean(
    group.fromContains ||
      group.subjectContains ||
      group.toContains ||
      group.requireAttachment,
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
  if (group.requireAttachment) {
    parts.push("ek var");
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
