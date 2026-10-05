import { parseTelegramInboundMessage } from "./socialHubTelegramWebhookParser";
import { mergeTelegramMediaGroupPart } from "./socialHubTelegramMediaGroupTypes";

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
      chatId: "99",
      externalThreadId: "99",
      bodyText: "Merhaba",
      externalMessageId: "42",
      media: [],
      mediaGroupId: null,
    });
  });

  it("parses photo with caption and media group id", () => {
    const result = parseTelegramInboundMessage({
      message: {
        message_id: 7,
        media_group_id: "abc-123",
        from: { id: 2, is_bot: false, first_name: "Ayşe" },
        chat: { id: 100, type: "private" },
        photo: [
          { file_id: "small", file_size: 1 },
          { file_id: "big", file_size: 9000 },
        ],
        caption: "İrsaliye",
      },
    });
    expect(result?.bodyText).toBe("İrsaliye");
    expect(result?.media[0]?.fileId).toBe("big");
    expect(result?.mediaGroupId).toBe("abc-123");
  });

  it("parses edited_message as edit", () => {
    const result = parseTelegramInboundMessage({
      edited_message: {
        message_id: 55,
        from: { id: 4, is_bot: false, first_name: "Zeynep" },
        chat: { id: 102, type: "private" },
        text: "Güncellendi",
      },
    });
    expect(result).toMatchObject({
      bodyText: "Güncellendi",
      externalMessageId: "55",
      isEdit: true,
    });
  });

  it("parses sticker as downloadable media", () => {
    const result = parseTelegramInboundMessage({
      message: {
        message_id: 8,
        from: { id: 3, is_bot: false, first_name: "Veli" },
        chat: { id: 101, type: "private" },
        sticker: { file_id: "stk1", is_animated: false },
      },
    });
    expect(result?.media[0]?.kind).toBe("sticker");
    expect(result?.media[0]?.contentType).toBe("image/webp");
  });
});

describe("mergeTelegramMediaGroupPart", () => {
  it("merges multiple photos into one album state", () => {
    const base = {
      connectionId: "c1",
      companyId: "co1",
      mediaGroupId: "g1",
      chatId: "99",
      externalThreadId: "99",
      displayLabel: "Ali",
      bodyText: "[fotoğraf]",
      media: [
        {
          fileId: "a",
          filename: "a.jpg",
          contentType: "image/jpeg",
          kind: "photo" as const,
        },
      ],
      externalMessageId: "1",
    };
    const merged = mergeTelegramMediaGroupPart(
      mergeTelegramMediaGroupPart(null, base),
      {
        ...base,
        bodyText: "Albüm açıklama",
        externalMessageId: "2",
        media: [
          {
            fileId: "b",
            filename: "b.jpg",
            contentType: "image/jpeg",
            kind: "photo",
          },
        ],
      },
    );
    expect(merged.bodyText).toBe("Albüm açıklama");
    expect(merged.media.map((m) => m.fileId).sort()).toEqual(["a", "b"]);
    expect(merged.externalMessageIds).toEqual(["1", "2"]);
  });
});
