import { AuthenticatedApiClient } from "./AuthenticatedApiClient";

export type MessagingThreadRecord = {
  threadId: string;
  counterpartyCompanyId: string;
};

export type ThreadMessageRecord = {
  id: string;
  senderCompanyId: string;
  bodyText: string;
  createdAt: string;
};

export class MessagingApiClient {
  public static async listThreads(
    accessToken: string,
    locale: string,
  ): Promise<{ threads: MessagingThreadRecord[] }> {
    return AuthenticatedApiClient.fetchJson(
      accessToken,
      `/messaging/threads?lang=${locale}`,
    ) as Promise<{ threads: MessagingThreadRecord[] }>;
  }

  public static async openThread(
    accessToken: string,
    locale: string,
    counterpartyCompanyId: string,
  ): Promise<{ thread: { id: string } }> {
    return AuthenticatedApiClient.fetchJson(
      accessToken,
      `/messaging/threads?lang=${locale}`,
      {
        method: "POST",
        body: JSON.stringify({ counterpartyCompanyId }),
      },
    ) as Promise<{ thread: { id: string } }>;
  }

  public static async listMessages(
    accessToken: string,
    locale: string,
    threadId: string,
  ): Promise<{ messages: ThreadMessageRecord[] }> {
    return AuthenticatedApiClient.fetchJson(
      accessToken,
      `/messaging/threads/${threadId}/messages?lang=${locale}`,
    ) as Promise<{ messages: ThreadMessageRecord[] }>;
  }

  public static async sendMessage(
    accessToken: string,
    locale: string,
    threadId: string,
    bodyText: string,
  ): Promise<void> {
    await AuthenticatedApiClient.fetchJson(
      accessToken,
      `/messaging/threads/${threadId}/messages?lang=${locale}`,
      {
        method: "POST",
        body: JSON.stringify({ bodyText }),
      },
    );
  }
}
