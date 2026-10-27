import { describe, expect, it } from "vitest";
import {
  messagingVoiceSttActiveCount,
  withMessagingVoiceSttSlot,
} from "./messagingVoiceSttConcurrency";

describe("messagingVoiceSttConcurrency", () => {
  it("limits concurrent slots", async () => {
    expect(messagingVoiceSttActiveCount()).toBe(0);
    const first = await withMessagingVoiceSttSlot(1, async () => {
      const busy = await withMessagingVoiceSttSlot(1, async () => "inner");
      expect(busy).toBe("stt-busy");
      return "done";
    });
    expect(first).toBe("done");
    expect(messagingVoiceSttActiveCount()).toBe(0);
  });
});
