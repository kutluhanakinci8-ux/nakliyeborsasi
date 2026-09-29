import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { WebSocketServer } from "ws";
import { MessagingRealtimeHubService } from "./MessagingRealtimeHubService";
import { MessagingStreamTicketService } from "./MessagingStreamTicketService";

@Injectable()
export class MessagingOptionalWsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessagingOptionalWsService.name);
  private wss: WebSocketServer | null = null;
  private enabled = false;

  public constructor(
    private readonly configService: ConfigService,
    private readonly hubService: MessagingRealtimeHubService,
    private readonly ticketService: MessagingStreamTicketService,
  ) {}

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getPort(): number | null {
    const raw = this.configService.get<string>("MESSAGING_WS_PORT")?.trim();
    if (!raw) {
      return null;
    }
    const port = Number.parseInt(raw, 10);
    return Number.isFinite(port) ? port : null;
  }

  public async onModuleInit(): Promise<void> {
    const port = this.getPort();
    if (!port || port < 1) {
      return;
    }
    try {
      const { WebSocketServer } = await import("ws");
      this.wss = new WebSocketServer({ port, host: "127.0.0.1" });
      this.wss.on("connection", (socket, request) => {
        try {
          const url = new URL(request.url ?? "/", "http://127.0.0.1");
          const ticket = url.searchParams.get("ticket") ?? "";
          const session = this.ticketService.consume(ticket);
          this.hubService.attachWebSocket(session.companyId, socket);
        } catch {
          socket.close(4401, "invalid ticket");
        }
      });
      this.enabled = true;
      this.logger.log(`Messaging WebSocket listening on 127.0.0.1:${port}`);
    } catch (error) {
      this.logger.warn(
        `Messaging WebSocket disabled: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  public async onModuleDestroy(): Promise<void> {
    await new Promise<void>((resolve) => {
      if (!this.wss) {
        resolve();
        return;
      }
      this.wss.close(() => resolve());
    });
    this.wss = null;
    this.enabled = false;
  }
}
