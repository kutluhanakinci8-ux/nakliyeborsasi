/** ahmetoner/whisper-asr-webservice — POST /asr (not OpenAI /v1/audio/transcriptions). */

export function resolveLocalWhisperAsrUrl(apiUrl: string): string {
  const trimmed = apiUrl.replace(/\/$/, "");
  if (trimmed.endsWith("/v1/audio/transcriptions")) {
    return trimmed.replace(/\/v1\/audio\/transcriptions$/i, "/asr");
  }
  if (/\/asr$/i.test(trimmed)) {
    return trimmed;
  }
  try {
    const withScheme = trimmed.includes("://") ? trimmed : `http://${trimmed}`;
    const origin = new URL(withScheme).origin;
    return `${origin}/asr`;
  } catch {
    return "http://127.0.0.1:9010/asr";
  }
}

export function buildLocalWhisperAsrRequestUrl(
  apiUrl: string,
  language?: string,
): string {
  const base = resolveLocalWhisperAsrUrl(apiUrl);
  const params = new URLSearchParams({
    task: "transcribe",
    output: "json",
    encode: "true",
  });
  if (language?.trim()) {
    params.set("language", language.trim().slice(0, 8));
  }
  return `${base}?${params.toString()}`;
}

export function parseLocalWhisperAsrResponseBody(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const payload = JSON.parse(trimmed) as {
      text?: string;
      transcription?: string;
    };
    const text = payload.text?.trim() || payload.transcription?.trim();
    return text || null;
  } catch {
    return trimmed;
  }
}
