import { Controller, Get } from "@nestjs/common";
import { DataSource } from "typeorm";
import { MessagingRealtimeHubService } from "../messaging/MessagingRealtimeHubService";

@Controller("health")
export class HealthController {
  public constructor(
    private readonly dataSource: DataSource,
    private readonly messagingRealtimeHubService: MessagingRealtimeHubService,
  ) {}

  @Get()
  public getHealth(): { status: string } {
    return { status: "ok" };
  }

  @Get("live")
  public getLive(): {
    status: string;
    messagingSse: ReturnType<MessagingRealtimeHubService["getStats"]>;
  } {
    return {
      status: "ok",
      messagingSse: this.messagingRealtimeHubService.getStats(),
    };
  }

  @Get("ready")
  public async getReady(): Promise<{ status: string; database: string }> {
    await this.dataSource.query("SELECT 1");
    return { status: "ok", database: "up" };
  }
}
