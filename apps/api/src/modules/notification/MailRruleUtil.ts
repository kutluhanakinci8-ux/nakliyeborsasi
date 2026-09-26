export type RecurrenceFrequency = "daily" | "weekly" | "monthly";

const MAX_EXPAND = 400;

export function frequencyToRrule(freq: RecurrenceFrequency): string {
  switch (freq) {
    case "daily":
      return "FREQ=DAILY";
    case "weekly":
      return "FREQ=WEEKLY";
    case "monthly":
      return "FREQ=MONTHLY";
    default:
      return "FREQ=DAILY";
  }
}

export function parseRecurrenceFrequency(
  rule: string | null | undefined,
): RecurrenceFrequency | null {
  if (!rule?.trim()) {
    return null;
  }
  const upper = rule.toUpperCase();
  if (upper.includes("FREQ=WEEKLY")) {
    return "weekly";
  }
  if (upper.includes("FREQ=MONTHLY")) {
    return "monthly";
  }
  if (upper.includes("FREQ=DAILY")) {
    return "daily";
  }
  return null;
}

function parseRruleParts(rule: string): {
  freq: RecurrenceFrequency;
  interval: number;
  until: Date | null;
} {
  const parts = rule.split(";").map((p) => p.trim());
  let freq: RecurrenceFrequency = "daily";
  let interval = 1;
  let until: Date | null = null;
  for (const part of parts) {
    const [key, value] = part.split("=");
    if (!key || !value) {
      continue;
    }
    const k = key.toUpperCase();
    if (k === "FREQ") {
      const f = value.toUpperCase();
      if (f === "WEEKLY") {
        freq = "weekly";
      } else if (f === "MONTHLY") {
        freq = "monthly";
      } else {
        freq = "daily";
      }
    } else if (k === "INTERVAL") {
      const n = Number.parseInt(value, 10);
      if (Number.isFinite(n) && n > 0) {
        interval = n;
      }
    } else if (k === "UNTIL") {
      until = parseIcalUntil(value);
    }
  }
  return { freq, interval, until };
}

function parseIcalUntil(raw: string): Date | null {
  const v = raw.trim();
  if (/^\d{8}T\d{6}Z$/.test(v)) {
    const iso = v.replace(
      /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
      "$1-$2-$3T$4:$5:$6Z",
    );
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (/^\d{8}$/.test(v)) {
    const y = Number(v.slice(0, 4));
    const m = Number(v.slice(4, 6)) - 1;
    const d = Number(v.slice(6, 8));
    return new Date(Date.UTC(y, m, d, 23, 59, 59));
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function addMonthsUtc(d: Date, months: number): Date {
  return new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth() + months,
      d.getUTCDate(),
      d.getUTCHours(),
      d.getUTCMinutes(),
      d.getUTCSeconds(),
      d.getUTCMilliseconds(),
    ),
  );
}

function advanceOccurrence(
  cursor: Date,
  freq: RecurrenceFrequency,
  interval: number,
): Date {
  if (freq === "monthly") {
    return addMonthsUtc(cursor, interval);
  }
  const dayMs = 24 * 60 * 60 * 1000;
  const step = freq === "weekly" ? 7 * dayMs : dayMs;
  return new Date(cursor.getTime() + step * interval);
}

export function expandEventOccurrences(input: {
  startsAt: Date;
  endsAt: Date;
  recurrenceRule: string;
  recurrenceUntil: Date | null;
  rangeFrom: Date;
  rangeTo: Date;
}): Array<{ startsAt: Date; endsAt: Date }> {
  const duration = input.endsAt.getTime() - input.startsAt.getTime();
  const { freq, interval, until: ruleUntil } = parseRruleParts(
    input.recurrenceRule,
  );
  const hardUntil = [input.recurrenceUntil, ruleUntil]
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

  const results: Array<{ startsAt: Date; endsAt: Date }> = [];
  let cursor = new Date(input.startsAt.getTime());
  let guard = 0;
  while (guard < MAX_EXPAND) {
    guard += 1;
    if (hardUntil && cursor.getTime() > hardUntil.getTime()) {
      break;
    }
    const ends = new Date(cursor.getTime() + duration);
    if (cursor.getTime() < input.rangeTo.getTime() && ends.getTime() > input.rangeFrom.getTime()) {
      results.push({ startsAt: new Date(cursor.getTime()), endsAt: ends });
    }
    if (cursor.getTime() >= input.rangeTo.getTime()) {
      break;
    }
    const next = advanceOccurrence(cursor, freq, interval);
    if (next.getTime() <= cursor.getTime()) {
      break;
    }
    cursor = next;
  }
  return results;
}

export function validateRecurrenceRule(rule: string): string {
  const trimmed = rule.trim();
  if (!trimmed) {
    throw new Error("Boş tekrar kuralı.");
  }
  if (trimmed.length > 500) {
    throw new Error("Tekrar kuralı çok uzun.");
  }
  const freq = parseRecurrenceFrequency(trimmed);
  if (!freq) {
    throw new Error("Desteklenen FREQ: DAILY, WEEKLY, MONTHLY.");
  }
  return trimmed;
}
