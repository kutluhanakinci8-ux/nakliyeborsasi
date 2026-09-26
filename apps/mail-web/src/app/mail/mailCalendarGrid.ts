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
