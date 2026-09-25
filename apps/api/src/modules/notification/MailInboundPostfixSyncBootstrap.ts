import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MailInboundRoutingService } from "./MailInboundRoutingService";

/**
 * VPS başlangıcında ve deploy sonrası Postfix virtual_alias haritasını günceller.
 */
@Injectable()
export class MailInboundPostfixSyncBootstrap implements OnModuleInit {
  private readonly logger = new Logger(MailInboundPostfixSyncBootstrap.name);

  public constructor(
    private readonly configService: ConfigService,
    private readonly mailInboundRoutingService: MailInboundRoutingService,
  ) {}

  public onModuleInit(): void {
    const apply =
      this.configService.get<string>("MAIL_INBOUND_APPLY_POSTFIX") === "true";
    if (!apply) {
      return;
    }
    const disabled =
      this.configService.get<string>("MAIL_INBOUND_SYNC_ON_STARTUP") ===
      "false";
    if (disabled) {
      return;
    }
    const delayMs = 8_000;
    setTimeout(() => {
      void this.sync();
    }, delayMs);
  }

  private async sync(): Promise<void> {
    try {
      const result =
        await this.mailInboundRoutingService.writePostfixVirtualMap();
      this.logger.log(
        `Postfix inbound sync: entries=${result.entryCount} written=${result.written} — ${result.detail}`,
      );
    } catch (error) {
      this.logger.warn(
        `Postfix inbound sync failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
