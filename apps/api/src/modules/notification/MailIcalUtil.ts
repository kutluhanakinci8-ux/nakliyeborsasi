export type ParsedIcalEvent = {
  uid: string | null;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
};

function formatUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function formatDateOnly(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function escapeIcalText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function parseIcalDate(value: string, allDay: boolean): Date {
  const v = value.trim();
  if (allDay && /^\d{8}$/.test(v)) {
    const y = Number(v.slice(0, 4));
    const m = Number(v.slice(4, 6)) - 1;
    const d = Number(v.slice(6, 8));
    return new Date(Date.UTC(y, m, d));
  }
  const normalized = v.endsWith("Z") ? v : `${v}Z`;
  const iso = normalized.replace(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
    "$1-$2-$3T$4:$5:$6Z",
  );
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Geçersiz tarih: ${value}`);
  }
  return parsed;
}

function unfoldIcalLines(text: string): string[] {
  const raw = text.replace(/\r\n/g, "\n").split("\n");
  const lines: string[] = [];
  for (const line of raw) {
    if (line.startsWith(" ") || line.startsWith("\t")) {
      if (lines.length === 0) {
        lines.push(line.trimStart());
      } else {
        lines[lines.length - 1] += line.trimStart();
      }
    } else {
      lines.push(line);
    }
  }
  return lines;
}

export function parseIcalEvents(icsText: string): ParsedIcalEvent[] {
  const lines = unfoldIcalLines(icsText);
  const events: ParsedIcalEvent[] = [];
  let inEvent = false;
  let title = "";
  let description: string | null = null;
  let location: string | null = null;
  let dtStart: string | null = null;
  let dtEnd: string | null = null;
  let allDay = false;
  let uid: string | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      title = "";
      description = null;
      location = null;
      dtStart = null;
      dtEnd = null;
      allDay = false;
      uid = null;
      continue;
    }
    if (line === "END:VEVENT" && inEvent) {
      if (!dtStart) {
        inEvent = false;
        continue;
      }
      const startAllDay = allDay || !dtStart.includes("T");
      const endAllDay = allDay || (dtEnd ? !dtEnd.includes("T") : startAllDay);
      const startsAt = parseIcalDate(dtStart, startAllDay);
      let endsAt = dtEnd
        ? parseIcalDate(dtEnd, endAllDay)
        : new Date(startsAt.getTime() + 60 * 60 * 1000);
      if (endAllDay && endsAt.getTime() <= startsAt.getTime()) {
        endsAt = new Date(startsAt.getTime() + 24 * 60 * 60 * 1000);
      }
      events.push({
        uid: uid?.trim() || null,
        title: title.trim() || "Etkinlik",
        description,
        location,
        startsAt,
        endsAt,
        allDay: startAllDay,
      });
      inEvent = false;
      continue;
    }
    if (!inEvent) {
      continue;
    }
    const [keyPart, ...rest] = line.split(":");
    const value = rest.join(":");
    const key = keyPart.split(";")[0]?.toUpperCase() ?? "";
    if (keyPart.includes("VALUE=DATE")) {
      allDay = true;
    }
    if (key === "SUMMARY") {
      title = value.replace(/\\n/g, "\n").replace(/\\,/g, ",");
    } else if (key === "DESCRIPTION") {
      description = value.replace(/\\n/g, "\n");
    } else if (key === "LOCATION") {
      location = value.replace(/\\n/g, "\n");
    } else if (key === "DTSTART") {
      dtStart = value;
    } else if (key === "DTEND") {
      dtEnd = value;
    } else if (key === "UID") {
      uid = value;
    }
  }
  return events;
}

export function buildIcalCalendar(
  events: Array<{
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    startsAt: Date;
    endsAt: Date;
    allDay: boolean;
  }>,
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lerta Posta//D6//TR",
    "CALSCALE:GREGORIAN",
  ];
  const now = formatUtc(new Date());
  for (const ev of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${ev.id}@posta.lerta.com.tr`);
    lines.push(`DTSTAMP:${now}`);
    if (ev.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatDateOnly(ev.startsAt)}`);
      lines.push(`DTEND;VALUE=DATE:${formatDateOnly(ev.endsAt)}`);
    } else {
      lines.push(`DTSTART:${formatUtc(ev.startsAt)}`);
      lines.push(`DTEND:${formatUtc(ev.endsAt)}`);
    }
    lines.push(`SUMMARY:${escapeIcalText(ev.title)}`);
    if (ev.description) {
      lines.push(`DESCRIPTION:${escapeIcalText(ev.description)}`);
    }
    if (ev.location) {
      lines.push(`LOCATION:${escapeIcalText(ev.location)}`);
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

