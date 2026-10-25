import { describe, it, expect, vi } from "vitest";
import { HealthController } from "./HealthController";
import type { DataSource } from "typeorm";
import type { MessagingRealtimeHubService } from "../messaging/MessagingRealtimeHubService";

describe("HealthController", () => {
  const dataSource = {
    query: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
  } as unknown as DataSource;

  const messagingRealtimeHubService = {
    getStats: vi.fn().mockReturnValue({ connections: 0 }),
  } as unknown as MessagingRealtimeHubService;

  const controller = new HealthController(dataSource, messagingRealtimeHubService);

  it("getHealth returns ok", () => {
    expect(controller.getHealth()).toEqual({ status: "ok" });
  });

  it("getLive includes messaging stats", () => {
    const live = controller.getLive();
    expect(live.status).toBe("ok");
    expect(live.messagingSse).toEqual({ connections: 0 });
  });

  it("getReady queries database", async () => {
    const ready = await controller.getReady();
    expect(ready).toEqual({ status: "ok", database: "up" });
    expect(dataSource.query).toHaveBeenCalledWith("SELECT 1");
  });
});
