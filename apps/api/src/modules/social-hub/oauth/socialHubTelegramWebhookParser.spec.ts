import { parseTelegramInboundMessage } from "./socialHubTelegramWebhookParser";

describe("parseTelegramInboundMessage", () => {
  it("parses text DM", () => {
    const result = parseTelegramInboundMessage({
      message: {
        message_id: 42,
        from: { id: 1, is_bot: false, first_name: "Ali" },
        chat: { id: 99, type: "private" },
        text: "Merhaba",
      },
    });
    expect(result).toMatchObject({
      externalThreadId: "99",
      bodyText: "Merhaba",
      externalMessageId: "42",
      media: [],
    });
  });

  it("parses photo with caption", () => {
    const result = parseTelegramInboundMessage({
      message: {
        message_id: 7,
        from: { id: 2, is_bot: false, first_name: "Ayşe" },
        chat: { id: 100, type: "private" },
        photo: [{ file_id: "small", file_size: 1 }, { file_id: "big", file_size: 9000 }],
        caption: "İrsaliye",
      },
    });
    expect(result?.bodyText).toBe("İrsaliye");
    expect(result?.media[0]?.fileId).toBe("big");
    expect(result?.media[0]?.kind).toBe("photo");
  });
});
