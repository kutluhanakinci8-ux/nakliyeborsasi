export type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

export type TelegramUser = {
  id: number;
  is_bot: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
};

export type TelegramGetMeResult = {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
};

export async function callTelegramBotApi<T>(
  botToken: string,
  method: string,
  payload?: Record<string, unknown>,
): Promise<TelegramApiResponse<T>> {
  const trimmed = botToken.trim();
  const url = `https://api.telegram.org/bot${trimmed}/${method}`;
  const response = await fetch(url, {
    method: payload ? "POST" : "GET",
    headers: payload ? { "Content-Type": "application/json" } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  });
  return (await response.json()) as TelegramApiResponse<T>;
}

export function formatTelegramBotLabel(me: TelegramGetMeResult): string {
  if (me.username?.trim()) {
    return `@${me.username.trim()}`;
  }
  return me.first_name?.trim() || `Bot ${me.id}`;
}
