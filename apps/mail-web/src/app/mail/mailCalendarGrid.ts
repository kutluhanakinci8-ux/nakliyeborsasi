export type CalendarGridCell = {
  year: number;
  month: number;
  day: number;
  inMonth: boolean;
  key: string;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function dayKeyFromParts(year: number, month: number, day: number): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

export function dayKeyFromIso(iso: string): string {
  const d = new Date(iso);
  return dayKeyFromParts(d.getFullYear(), d.getMonth(), d.getDate());
}

export function enumerateDayKeysBetween(
  startsAtIso: string,
  endsAtIso: string,
): string[] {
  const start = new Date(startsAtIso);
  const end = new Date(endsAtIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return [];
  }
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const keys: string[] = [];
  while (cursor.getTime() <= last.getTime()) {
    keys.push(dayKeyFromParts(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys.length > 0 ? keys : [dayKeyFromIso(startsAtIso)];
}

export function eventOverlapsDayKey(
  startsAtIso: string,
  endsAtIso: string,
  dayKey: string,
): boolean {
  return enumerateDayKeysBetween(startsAtIso, endsAtIso).includes(dayKey);
}

export function buildMonthGrid(year: number, month: number): CalendarGridCell[] {
  const first = new Date(year, month, 1);
  const startPad = (first.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - startPad);
  const cells: CalendarGridCell[] = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + i,
    );
    cells.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      day: d.getDate(),
      inMonth: d.getMonth() === month,
      key: dayKeyFromParts(d.getFullYear(), d.getMonth(), d.getDate()),
    });
  }
  return cells;
}
