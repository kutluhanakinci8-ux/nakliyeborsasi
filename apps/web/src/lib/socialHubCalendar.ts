export type CalendarCell = {
  dateKey: string;
  inMonth: boolean;
  date: Date;
};

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Pazartesi ile başlayan 6 haftalık takvim ızgarası */
export function buildMonthGrid(anchor: Date): CalendarCell[] {
  const first = startOfMonth(anchor);
  const start = new Date(first);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);
  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i += 1) {
    const cellDate = new Date(start);
    cellDate.setDate(start.getDate() + i);
    cells.push({
      dateKey: toDateKey(cellDate),
      inMonth: cellDate.getMonth() === anchor.getMonth(),
      date: cellDate,
    });
  }
  return cells;
}

export function buildWeekGrid(anchor: Date): CalendarCell[] {
  const start = new Date(anchor);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);
  const cells: CalendarCell[] = [];
  for (let i = 0; i < 7; i += 1) {
    const cellDate = new Date(start);
    cellDate.setDate(start.getDate() + i);
    cells.push({
      dateKey: toDateKey(cellDate),
      inMonth: true,
      date: cellDate,
    });
  }
  return cells;
}

export function monthLabelTr(date: Date): string {
  return date.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
}
