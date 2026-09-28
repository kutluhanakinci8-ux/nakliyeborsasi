import { Injectable } from "@nestjs/common";
import type { Response } from "express";

type StreamClient = {
  res: Response;
  heartbeat: ReturnType<typeof setInterval>;
};

@Injectable()
export class MessagingRealtimeHubService {
  private readonly clientsByCompany = new Map<string, Set<StreamClient>>();

  public attach(companyId: string, res: Response): void {
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    res.write(": connected\n\n");

    const heartbeat = setInterval(() => {
      res.write(": ping\n\n");
    }, 25_000);

    const client: StreamClient = { res, heartbeat };
    const set =
      this.clientsByCompany.get(companyId) ?? new Set<StreamClient>();
    set.add(client);
    this.clientsByCompany.set(companyId, set);

    res.on("close", () => {
      clearInterval(heartbeat);
      set.delete(client);
      if (set.size === 0) {
        this.clientsByCompany.delete(companyId);
      }
    });
  }

  public publish(
    companyId: string,
    payload: { type: string; threadId?: string },
  ): void {
    const set = this.clientsByCompany.get(companyId);
    if (!set?.size) {
      return;
    }
    const data = JSON.stringify(payload);
    for (const client of set) {
      try {
        client.res.write(`event: message\ndata: ${data}\n\n`);
      } catch {
        /* bağlantı kapanmış olabilir */
      }
    }
  }
}
