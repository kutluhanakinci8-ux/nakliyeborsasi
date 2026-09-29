import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Response } from "express";
import type Redis from "ioredis";
import { RedisConnectionProvider } from "../../infrastructure/redis/RedisConnectionProvider";

type StreamClient = {
  res: Response;
  heartbeat: ReturnType<typeof setInterval>;
};

type WsStreamClient = {
  socket: { send: (data: string) => void; close: (code?: number) => void; readyState: number };
  heartbeat: ReturnType<typeof setInterval>;
};

const REDIS_SSE_CHANNEL = "messaging:sse:fanout";

@Injectable()
export class MessagingRealtimeHubService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(MessagingRealtimeHubService.name);
  private readonly clientsByCompany = new Map<string, Set<StreamClient>>();
  private readonly wsClientsByCompany = new Map<string, Set<WsStreamClient>>();
  private readonly maxPerCompany = Number.parseInt(
    process.env.MESSAGING_SSE_MAX_CONNECTIONS_PER_COMPANY ?? "80",
    10,
  );
  private redisSubscriber: Redis | null = null;
  private redisFanoutEnabled = false;

  public constructor(
    private readonly configService: ConfigService,
    private readonly redisConnectionProvider: RedisConnectionProvider,
  ) {}

  public async onModuleInit(): Promise<void> {
    const explicit =
      this.configService.get<string>("MESSAGING_SSE_REDIS_FANOUT")?.trim();
    const redisUrl = this.configService.get<string>("REDIS_URL")?.trim();
    const shouldEnable =
      explicit === "0" || explicit === "false"
        ? false
        : explicit === "1" || explicit === "true" || Boolean(redisUrl);
    if (!shouldEnable) {
      return;
    }
    try {
      const base = this.redisConnectionProvider.getClient();
      this.redisSubscriber = base.duplicate();
      await this.redisSubscriber.subscribe(REDIS_SSE_CHANNEL);
      this.redisSubscriber.on("message", (_channel, raw) => {
        try {
          const parsed = JSON.parse(raw) as {
            companyId?: string;
            payload?: { type: string; threadId?: string };
            originInstanceId?: string;
          };
          if (!parsed.companyId || !parsed.payload) {
            return;
          }
          if (parsed.originInstanceId === this.instanceId()) {
            return;
          }
          this.deliverLocal(parsed.companyId, parsed.payload);
        } catch {
          /* ignore malformed fan-out */
        }
      });
      this.redisFanoutEnabled = true;
      this.logger.log("Messaging SSE Redis fan-out enabled");
    } catch (error) {
      this.logger.warn(
        `Messaging SSE Redis fan-out unavailable: ${String(error)}`,
      );
    }
  }

  public async onModuleDestroy(): Promise<void> {
    if (this.redisSubscriber) {
      await this.redisSubscriber.quit();
      this.redisSubscriber = null;
    }
  }

  public getStats(): {
    companies: number;
    connections: number;
    maxPerCompany: number;
    redisFanout: boolean;
    instanceId: string;
    wsConnections: number;
  } {
    let connections = 0;
    for (const set of this.clientsByCompany.values()) {
      connections += set.size;
    }
    let wsConnections = 0;
    for (const set of this.wsClientsByCompany.values()) {
      wsConnections += set.size;
    }
    return {
      companies: this.clientsByCompany.size,
      connections,
      maxPerCompany: this.maxPerCompany,
      redisFanout: this.redisFanoutEnabled,
      instanceId: this.instanceId(),
      wsConnections,
    };
  }

  public attachWebSocket(companyId: string, socket: import("ws").WebSocket): void {
    const set =
      this.wsClientsByCompany.get(companyId) ?? new Set<WsStreamClient>();
    if (set.size >= this.maxPerCompany) {
      socket.close(4429);
      return;
    }
    const heartbeat = setInterval(() => {
      if (socket.readyState === 1) {
        socket.send(JSON.stringify({ type: "ping" }));
      }
    }, 25_000);
    const client: WsStreamClient = { socket, heartbeat };
    set.add(client);
    this.wsClientsByCompany.set(companyId, set);
    socket.send(JSON.stringify({ type: "connected" }));
    const dispose = () => {
      clearInterval(heartbeat);
      set.delete(client);
      if (set.size === 0) {
        this.wsClientsByCompany.delete(companyId);
      }
    };
    socket.on("close", dispose);
  }

  public attach(companyId: string, res: Response): void {
    const set =
      this.clientsByCompany.get(companyId) ?? new Set<StreamClient>();
    if (set.size >= this.maxPerCompany) {
      res.status(429).json({
        message: "SSE bağlantı limiti aşıldı. Lütfen yeniden deneyin.",
      });
      return;
    }
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    res.write(": connected\n\n");

    const heartbeat = setInterval(() => {
      res.write(": ping\n\n");
    }, 25_000);

    const client: StreamClient = { res, heartbeat };
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
    payload: { type: string; threadId?: string; userId?: string; companyId?: string },
  ): void {
    this.deliverLocal(companyId, payload);
    if (!this.redisFanoutEnabled) {
      return;
    }
    try {
      const redisClient = this.redisConnectionProvider.getClient();
      void redisClient.publish(
        REDIS_SSE_CHANNEL,
        JSON.stringify({
          companyId,
          payload,
          originInstanceId: this.instanceId(),
        }),
      );
    } catch {
      /* local delivery already done */
    }
  }

  private deliverLocal(
    companyId: string,
    payload: { type: string; threadId?: string },
  ): void {
    const data = JSON.stringify(payload);
    const set = this.clientsByCompany.get(companyId);
    if (set?.size) {
      for (const client of set) {
        try {
          client.res.write(`event: message\ndata: ${data}\n\n`);
        } catch {
          /* bağlantı kapanmış olabilir */
        }
      }
    }
    const wsSet = this.wsClientsByCompany.get(companyId);
    if (wsSet?.size) {
      for (const client of wsSet) {
        try {
          if (client.socket.readyState === 1) {
            client.socket.send(data);
          }
        } catch {
          /* ignore */
        }
      }
    }
  }

  private instanceId(): string {
    return (
      this.configService.get<string>("MESSAGING_SSE_INSTANCE_ID")?.trim() ||
      process.env.HOSTNAME ||
      "local"
    );
  }
}
