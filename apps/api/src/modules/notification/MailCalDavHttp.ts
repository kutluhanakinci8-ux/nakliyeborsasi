const FETCH_TIMEOUT_MS = 25_000;

function basicAuthHeader(username: string, password: string): string {
  const token = Buffer.from(`${username}:${password}`, "utf8").toString("base64");
  return `Basic ${token}`;
}

async function davRequest(
  method: string,
  url: string,
  username: string,
  password: string,
  body?: string,
  depth?: string,
): Promise<{ status: number; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = {
      Authorization: basicAuthHeader(username, password),
    };
    if (body !== undefined) {
      headers["Content-Type"] = "application/xml; charset=utf-8";
    }
    if (depth !== undefined) {
      headers.Depth = depth;
    }
    const response = await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal,
    });
    const text = await response.text();
    return { status: response.status, text };
  } finally {
    clearTimeout(timer);
  }
}

function formatCalDavTime(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function extractCalendarDataFromMultistatus(xml: string): string[] {
  const blocks: string[] = [];
  const pattern =
    /<(?:[\w-]+:)?calendar-data[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?calendar-data>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(xml)) !== null) {
    let chunk = match[1] ?? "";
    if (chunk.includes("<![CDATA[")) {
      chunk = chunk.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
    }
    chunk = chunk
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (_, code) =>
        String.fromCharCode(Number.parseInt(code, 10)),
      );
    if (chunk.includes("BEGIN:VCALENDAR") || chunk.includes("BEGIN:VEVENT")) {
      blocks.push(chunk);
    }
  }
  return blocks;
}

export async function calDavPropfind(
  calendarUrl: string,
  username: string,
  password: string,
): Promise<void> {
  const body = `<?xml version="1.0" encoding="utf-8" ?>
<D:propfind xmlns:D="DAV:">
  <D:prop><D:resourcetype/><D:displayname/></D:prop>
</D:propfind>`;
  const { status } = await davRequest(
    "PROPFIND",
    calendarUrl,
    username,
    password,
    body,
    "0",
  );
  if (status !== 207 && status !== 200) {
    throw new Error(`CalDAV PROPFIND HTTP ${status}`);
  }
}

export async function calDavCalendarQuery(
  calendarUrl: string,
  username: string,
  password: string,
  from: Date,
  to: Date,
): Promise<string[]> {
  const start = formatCalDavTime(from);
  const end = formatCalDavTime(to);
  const body = `<?xml version="1.0" encoding="utf-8" ?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:getetag/>
    <C:calendar-data/>
  </D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="${start}" end="${end}"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`;
  const { status, text } = await davRequest(
    "REPORT",
    calendarUrl,
    username,
    password,
    body,
    "1",
  );
  if (status !== 207) {
    throw new Error(`CalDAV REPORT HTTP ${status}`);
  }
  return extractCalendarDataFromMultistatus(text);
}

export async function calDavPutIcs(
  resourceUrl: string,
  username: string,
  password: string,
  icsBody: string,
  ifMatchEtag?: string | null,
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = {
      Authorization: basicAuthHeader(username, password),
      "Content-Type": "text/calendar; charset=utf-8",
    };
    if (ifMatchEtag) {
      headers["If-Match"] = ifMatchEtag;
    }
    const response = await fetch(resourceUrl, {
      method: "PUT",
      headers,
      body: icsBody,
      signal: controller.signal,
    });
    if (response.status === 412) {
      throw new Error("CalDAV ETag uyuşmazlığı (412); sunucudan yeniden çekin.");
    }
    if (
      response.status !== 201 &&
      response.status !== 204 &&
      response.status !== 200
    ) {
      throw new Error(`CalDAV PUT HTTP ${response.status}`);
    }
    const etag = response.headers.get("etag");
    return etag?.replace(/^"|"$/g, "") ?? null;
  } finally {
    clearTimeout(timer);
  }
}

export async function calDavDeleteResource(
  resourceUrl: string,
  username: string,
  password: string,
  ifMatchEtag?: string | null,
): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = {
      Authorization: basicAuthHeader(username, password),
    };
    if (ifMatchEtag) {
      headers["If-Match"] = ifMatchEtag;
    }
    const response = await fetch(resourceUrl, {
      method: "DELETE",
      headers,
      signal: controller.signal,
    });
    if (response.status === 404) {
      return;
    }
    if (response.status === 412) {
      throw new Error("CalDAV silme ETag uyuşmazlığı (412).");
    }
    if (
      response.status !== 200 &&
      response.status !== 204 &&
      response.status !== 202
    ) {
      throw new Error(`CalDAV DELETE HTTP ${response.status}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

export function joinCalDavResourceUrl(
  calendarUrl: string,
  fileName: string,
): string {
  const base = calendarUrl.endsWith("/") ? calendarUrl : `${calendarUrl}/`;
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return new URL(safeName, base).toString();
}

function decodeDavXmlChunk(chunk: string): string {
  let text = chunk;
  if (text.includes("<![CDATA[")) {
    text = text.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
  }
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCharCode(Number.parseInt(code, 10)),
    );
}

export function extractAddressDataFromMultistatus(xml: string): string[] {
  const blocks: string[] = [];
  const pattern =
    /<(?:[\w-]+:)?address-data[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?address-data>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(xml)) !== null) {
    const chunk = decodeDavXmlChunk(match[1] ?? "");
    if (chunk.includes("BEGIN:VCARD")) {
      blocks.push(chunk);
    }
  }
  return blocks;
}

export async function cardDavAddressbookQuery(
  addressbookUrl: string,
  username: string,
  password: string,
): Promise<string[]> {
  const body = `<?xml version="1.0" encoding="utf-8" ?>
<C:addressbook-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:carddav">
  <D:prop>
    <D:getetag/>
    <C:address-data/>
  </D:prop>
  <C:filter>
    <C:prop-filter name="FN">
      <C:is-defined/>
    </C:prop-filter>
  </C:filter>
</C:addressbook-query>`;
  const { status, text } = await davRequest(
    "REPORT",
    addressbookUrl,
    username,
    password,
    body,
    "1",
  );
  if (status !== 207) {
    throw new Error(`CardDAV REPORT HTTP ${status}`);
  }
  return extractAddressDataFromMultistatus(text);
}

export async function cardDavPutVcard(
  resourceUrl: string,
  username: string,
  password: string,
  vcardBody: string,
): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(resourceUrl, {
      method: "PUT",
      headers: {
        Authorization: basicAuthHeader(username, password),
        "Content-Type": "text/vcard; charset=utf-8",
      },
      body: vcardBody,
      signal: controller.signal,
    });
    if (
      response.status !== 201 &&
      response.status !== 204 &&
      response.status !== 200
    ) {
      throw new Error(`CardDAV PUT HTTP ${response.status}`);
    }
  } finally {
    clearTimeout(timer);
  }
}
