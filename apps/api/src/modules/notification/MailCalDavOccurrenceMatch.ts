/** CalDAV / iCal EXDATE ile DB occurrenceStartsAt eşleştirme (timezone kayması). */

const TIMED_TOLERANCE_MS = 60_000;

export function sameUtcDate(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export function occurrenceInstantMatches(
  stored: Date,
  candidate: Date,
  allDay: boolean,
): boolean {
  const a = new Date(stored.getTime());
  const b = new Date(candidate.getTime());
  if (allDay) {
    return sameUtcDate(a, b);
  }
  return Math.abs(a.getTime() - b.getTime()) <= TIMED_TOLERANCE_MS;
}

export function exDateListIncludes(
  exDates: Date[],
  occurrence: Date,
  allDay: boolean,
): boolean {
  return exDates.some((ex) => occurrenceInstantMatches(occurrence, ex, allDay));
}
