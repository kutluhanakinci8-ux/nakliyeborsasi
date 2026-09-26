export type ParsedVcfContact = {
  displayName: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

function unfoldVcfLines(text: string): string[] {
  const raw = text.replace(/\r\n/g, "\n").split("\n");
  const lines: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += line.trimStart();
    } else {
      lines.push(line);
    }
  }
  return lines;
}

function unescapeVcf(value: string): string {
  return value.replace(/\\n/g, "\n").replace(/\\,/g, ",");
}

export function parseVcfContacts(vcfText: string): ParsedVcfContact[] {
  const lines = unfoldVcfLines(vcfText);
  const contacts: ParsedVcfContact[] = [];
  let inCard = false;
  let fn: string | null = null;
  let n: string | null = null;
  let email: string | null = null;
  let phone: string | null = null;
  let note: string | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VCARD") {
      inCard = true;
      fn = null;
      n = null;
      email = null;
      phone = null;
      note = null;
      continue;
    }
    if (line === "END:VCARD" && inCard) {
      const displayName =
        fn?.trim() ||
        n?.trim().replace(/;/g, " ").trim() ||
        email?.trim() ||
        "Kişi";
      contacts.push({
        displayName,
        email: email?.trim().toLowerCase() || null,
        phone: phone?.trim() || null,
        notes: note?.trim() || null,
      });
      inCard = false;
      continue;
    }
    if (!inCard) {
      continue;
    }
    const colon = line.indexOf(":");
    if (colon < 0) {
      continue;
    }
    const key = line.slice(0, colon).split(";")[0]?.toUpperCase() ?? "";
    const value = unescapeVcf(line.slice(colon + 1));
    if (key === "FN") {
      fn = value;
    } else if (key === "N") {
      n = value;
    } else if (key === "EMAIL" && !email) {
      email = value;
    } else if (key === "TEL" && !phone) {
      phone = value;
    } else if (key === "NOTE" && !note) {
      note = value;
    }
  }
  return contacts;
}
