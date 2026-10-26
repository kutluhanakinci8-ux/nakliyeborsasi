export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: "default" | null;
};

type ExpoPushTicket = {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
};

export function buildMessagingExpoPushMessage(params: {
  expoPushToken: string;
  title: string;
  body: string;
  url: string;
}): ExpoPushMessage {
  return {
    to: params.expoPushToken,
    title: params.title,
    body: params.body.slice(0, 180),
    sound: "default",
    data: { url: params.url },
  };
}

export async function sendExpoPushMessages(
  messages: ExpoPushMessage[],
): Promise<ExpoPushTicket[]> {
  if (messages.length === 0) {
    return [];
  }
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });
  if (!response.ok) {
    throw new Error(`Expo push HTTP ${response.status}`);
  }
  const payload = (await response.json()) as { data?: ExpoPushTicket[] };
  return payload.data ?? [];
}

export function isExpoPushTokenInvalid(ticket: ExpoPushTicket): boolean {
  if (ticket.status !== "error") {
    return false;
  }
  const code = ticket.details?.error ?? ticket.message ?? "";
  return (
    code === "DeviceNotRegistered" ||
    code.includes("InvalidCredentials") ||
    code.includes("MessageTooBig")
  );
}
