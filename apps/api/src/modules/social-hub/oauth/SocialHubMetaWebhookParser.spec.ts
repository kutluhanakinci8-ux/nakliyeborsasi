import { describe, expect, it } from "vitest";
import { parseMetaWebhookBody } from "./SocialHubMetaWebhookParser";

describe("SocialHubMetaWebhookParser", () => {
  it("parses instagram messaging text", () => {
    const body = {
      object: "instagram",
      entry: [
        {
          id: "17841426757865914",
          time: 1,
          messaging: [
            {
              sender: { id: "customer-igsid" },
              recipient: { id: "17841426757865914" },
              timestamp: 2,
              message: { mid: "m1", text: "Merhaba" },
            },
          ],
        },
      ],
    };
    const { messages } = parseMetaWebhookBody(body);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.bodyText).toBe("Merhaba");
    expect(messages[0]?.channel).toBe("instagram");
  });

  it("parses instagram attachment-only as media placeholder", () => {
    const body = {
      object: "instagram",
      entry: [
        {
          id: "ig-professional",
          messaging: [
            {
              sender: { id: "cust" },
              recipient: { id: "ig-professional" },
              message: {
                mid: "m2",
                attachments: [{ type: "image", payload: { url: "https://x" } }],
              },
            },
          ],
        },
      ],
    };
    const { messages } = parseMetaWebhookBody(body);
    expect(messages[0]?.bodyText).toBe("[image]");
  });

  it("parses instagram entry-level messages field", () => {
    const body = {
      object: "instagram",
      entry: [
        {
          id: "ig-professional",
          time: 1,
          field: "messages",
          value: {
            sender: { id: "cust", username: "tester" },
            recipient: { id: "ig-professional" },
            message: { mid: "m3", text: "DM" },
          },
        },
      ],
    };
    const { messages } = parseMetaWebhookBody(body);
    expect(messages[0]?.displayLabel).toBe("@tester");
    expect(messages[0]?.bodyText).toBe("DM");
  });

  it("skips instagram echo messages", () => {
    const body = {
      object: "instagram",
      entry: [
        {
          id: "ig",
          messaging: [
            {
              sender: { id: "ig" },
              recipient: { id: "cust" },
              message: { mid: "e1", text: "bizden", is_echo: true },
            },
          ],
        },
      ],
    };
    expect(parseMetaWebhookBody(body).messages).toHaveLength(0);
  });
});
