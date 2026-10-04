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

  it("parses whatsapp business account text message", () => {
    const body = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "1016724694765291",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "15556309023",
                  phone_number_id: "1359460837248586",
                },
                contacts: [{ profile: { name: "Test User" }, wa_id: "905546902543" }],
                messages: [
                  {
                    from: "905546902543",
                    id: "wamid.test",
                    timestamp: "1700000000",
                    type: "text",
                    text: { body: "tst" },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const { object, messages } = parseMetaWebhookBody(body);
    expect(object).toBe("whatsapp_business_account");
    expect(messages).toHaveLength(1);
    expect(messages[0]?.bodyText).toBe("tst");
    expect(messages[0]?.displayLabel).toBe("Test User");
    expect(messages[0]?.whatsAppPhoneNumberId).toBe("1359460837248586");
  });

  it("parses whatsapp image without caption as placeholder", () => {
    const body = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "waba",
          changes: [
            {
              field: "messages",
              value: {
                messages: [
                  {
                    from: "9055",
                    id: "wamid.img",
                    type: "image",
                    image: { mime_type: "image/jpeg", sha256: "x", id: "media" },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    expect(parseMetaWebhookBody(body).messages[0]?.bodyText).toBe("[image]");
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
