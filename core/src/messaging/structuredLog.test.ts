import { describe, expect, it } from "vitest";
import { formatMessagingStructuredLog } from "./structuredLog";

describe("formatMessagingStructuredLog", () => {
  it("emits JSON with component and event", () => {
    const line = formatMessagingStructuredLog("test_event", {
      companyId: "c1",
      threadId: "t1",
      skip: null,
    });
    const parsed = JSON.parse(line) as Record<string, string>;
    expect(parsed.component).toBe("messaging");
    expect(parsed.event).toBe("test_event");
    expect(parsed.companyId).toBe("c1");
    expect(parsed.skip).toBeUndefined();
  });
});
