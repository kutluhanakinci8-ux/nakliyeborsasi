import { describe, expect, it } from "vitest";
import { buildMessagingExpoPushMessage } from "./expoPushSend";

describe("buildMessagingExpoPushMessage", () => {
  it("builds payload with url data", () => {
    const msg = buildMessagingExpoPushMessage({
      expoPushToken: "ExponentPushToken[abc]",
      title: "Test",
      body: "Hello",
      url: "https://app.lerta.com.tr/messaging",
    });
    expect(msg.to).toBe("ExponentPushToken[abc]");
    expect(msg.data?.url).toContain("messaging");
    expect(msg.body).toBe("Hello");
  });
});
