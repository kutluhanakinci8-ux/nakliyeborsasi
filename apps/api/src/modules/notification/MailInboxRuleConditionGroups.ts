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
