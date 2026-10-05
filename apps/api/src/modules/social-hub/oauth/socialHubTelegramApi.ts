import { callWithTelegramFloodRetry } from "./socialHubTelegramFlood";

export type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
  parameters?: {
    retry_after?: number;
  };
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
  linked_chat_id?: number;
};

export type TelegramFile = {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
};

async function parseTelegramHttpJson<T>(
  response: Response,
): Promise<TelegramApiResponse<T>> {
  try {
    return (await response.json()) as TelegramApiResponse<T>;
  } catch {
    if (response.status === 429) {
      const retryHeader = response.headers.get("retry-after");
      const retryAfter = retryHeader
        ? Number.parseInt(retryHeader, 10)
        : undefined;
      return {
        ok: false,
        error_code: 429,
        description: "Too Many Requests",
        parameters:
          retryAfter && retryAfter > 0 ? { retry_after: retryAfter } : undefined,
      };
    }
    return {
      ok: false,
      description: `Telegram HTTP ${response.status}`,
    };
  }
}

export async function callTelegramBotApi<T>(
  botToken: string,
  method: string,
  payload?: Record<string, unknown>,
): Promise<TelegramApiResponse<T>> {
  const trimmed = botToken.trim();
  const url = `https://api.telegram.org/bot${trimmed}/${method}`;
  return callWithTelegramFloodRetry(async () => {
    const response = await fetch(url, {
      method: payload ? "POST" : "GET",
      headers: payload ? { "Content-Type": "application/json" } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
    });
    const body = await parseTelegramHttpJson<T>(response);
    if (!body.ok && response.status === 429 && !body.error_code) {
      body.error_code = 429;
    }
    return body;
  });
}

export async function callTelegramBotMultipart<T>(
  botToken: string,
  method: string,
  form: FormData,
): Promise<TelegramApiResponse<T>> {
  const trimmed = botToken.trim();
  const url = `https://api.telegram.org/bot${trimmed}/${method}`;
  return callWithTelegramFloodRetry(async () => {
    const response = await fetch(url, { method: "POST", body: form });
    const body = await parseTelegramHttpJson<T>(response);
    if (!body.ok && response.status === 429 && !body.error_code) {
      body.error_code = 429;
    }
    return body;
  });
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
