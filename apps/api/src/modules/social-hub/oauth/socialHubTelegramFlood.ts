export type TelegramApiFailureShape = {
  ok: boolean;
  description?: string;
  error_code?: number;
  parameters?: {
    retry_after?: number;
  };
};

export const TELEGRAM_FLOOD_MAX_ATTEMPTS = 4;
export const TELEGRAM_FLOOD_MAX_WAIT_MS = 30_000;

export function isTelegramFloodError(
  response: Pick<TelegramApiFailureShape, "ok" | "error_code" | "description">,
): boolean {
  if (response.ok) {
    return false;
  }
  if (response.error_code === 429) {
    return true;
  }
  const desc = response.description?.toLowerCase() ?? "";
  return (
    desc.includes("too many requests") || desc.includes("retry after")
  );
}

export function extractTelegramRetryAfterSeconds(
  response: Pick<TelegramApiFailureShape, "description" | "parameters">,
): number | null {
  const fromParams = response.parameters?.retry_after;
  if (typeof fromParams === "number" && fromParams > 0) {
    return Math.ceil(fromParams);
  }
  const desc = response.description ?? "";
  const match = /retry after (\d+)/i.exec(desc);
  if (match?.[1]) {
    const parsed = Number.parseInt(match[1], 10);
    if (parsed > 0) {
      return parsed;
    }
  }
  return null;
}

export function formatTelegramApiFailureMessage(
  response: TelegramApiFailureShape,
  fallback: string,
): string {
  if (isTelegramFloodError(response)) {
    const seconds = extractTelegramRetryAfterSeconds(response);
    if (seconds) {
      return `Telegram istek limiti (flood): yaklaşık ${seconds} sn sonra tekrar deneyin.`;
    }
    return "Telegram istek limiti (flood): bir süre bekleyip tekrar deneyin.";
  }
  const detail = response.description?.trim();
  return detail || fallback;
}

export function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function callWithTelegramFloodRetry<T extends TelegramApiFailureShape>(
  operation: () => Promise<T>,
): Promise<T> {
  let last: T | undefined;
  for (let attempt = 0; attempt < TELEGRAM_FLOOD_MAX_ATTEMPTS; attempt++) {
    last = await operation();
    if (!isTelegramFloodError(last)) {
      return last;
    }
    if (attempt >= TELEGRAM_FLOOD_MAX_ATTEMPTS - 1) {
      return last;
    }
    const seconds = extractTelegramRetryAfterSeconds(last) ?? 1;
    const waitMs = Math.min(seconds * 1000, TELEGRAM_FLOOD_MAX_WAIT_MS);
    await sleepMs(waitMs);
  }
  return last!;
}
