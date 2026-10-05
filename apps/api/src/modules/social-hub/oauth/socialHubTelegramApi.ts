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

export type TelegramChat = {
  id: number;
  type: string;
  title?: string;
  username?: string;
};

export type TelegramFile = {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
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

export async function callTelegramBotMultipart<T>(
  botToken: string,
  method: string,
  form: FormData,
): Promise<TelegramApiResponse<T>> {
  const trimmed = botToken.trim();
  const url = `https://api.telegram.org/bot${trimmed}/${method}`;
  const response = await fetch(url, { method: "POST", body: form });
  return (await response.json()) as TelegramApiResponse<T>;
}

export function formatTelegramBotLabel(me: TelegramGetMeResult): string {
  if (me.username?.trim()) {
    return `@${me.username.trim()}`;
  }
  return me.first_name?.trim() || `Bot ${me.id}`;
}

export async function telegramGetFilePath(
  botToken: string,
  fileId: string,
): Promise<string | null> {
  const response = await callTelegramBotApi<TelegramFile>(botToken, "getFile", {
    file_id: fileId,
  });
  if (!response.ok || !response.result?.file_path) {
    return null;
  }
  return response.result.file_path;
}

export async function telegramDownloadFile(
  botToken: string,
  filePath: string,
): Promise<Buffer | null> {
  const trimmed = botToken.trim();
  const url = `https://api.telegram.org/file/bot${trimmed}/${filePath}`;
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export function normalizeTelegramChannelRef(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.startsWith("@")) {
    return trimmed;
  }
  if (/^-?\d+$/.test(trimmed)) {
    return trimmed;
  }
  return `@${trimmed.replace(/^@/, "")}`;
}
