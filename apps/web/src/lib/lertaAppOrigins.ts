/** Logistics uygulaması kök URL — mail iframe postMessage için. */
export function listLertaAppOrigins(): string[] {
  const raw = process.env.NEXT_PUBLIC_LERTA_APP_ORIGINS?.trim();
  if (raw) {
    return raw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }
  const single = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (single) {
    return [single.replace(/\/$/, "")];
  }
  return ["https://app.lerta.com.tr", "http://localhost:3011", "http://127.0.0.1:3011"];
}
