import {
  buildDiscussionExternalThreadId,
  extractDiscussionPostKey,
  parseDiscussionExternalThreadId,
  resolveTelegramDiscussionRouting,
} from "./socialHubTelegramDiscussionRouting";

describe("socialHubTelegramDiscussionRouting", () => {
  it("builds per-post thread id", () => {
    expect(buildDiscussionExternalThreadId("-1001", "55")).toBe(
      "dg:-1001:post:55",
    );
  });

  it("parses discussion thread id for outbound", () => {
    expect(parseDiscussionExternalThreadId("dg:-1001:post:55")).toEqual({
      discussionGroupChatId: "-1001",
      postMessageId: 55,
    });
  });

  it("routes discussion group messages separately from dm", () => {
    const message = {
      reply_to_message: {
        message_id: 10,
        is_automatic_forward: true,
      },
    };
    const routed = resolveTelegramDiscussionRouting({
      chatId: "-10099",
      discussionGroupChatId: "-10099",
      senderDisplayLabel: "Ali",
      message,
    });
    expect(routed.isDiscussionComment).toBe(true);
    expect(routed.externalThreadId).toBe("dg:-10099:post:10");
    expect(routed.displayLabel).toContain("Kanal yorumu");
    expect(extractDiscussionPostKey(message)).toBe("10");
  });
});
