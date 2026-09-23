import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TELEMETRY_ROUTE_REBUILD_EVERY_N_SAMPLES } from "@nakliyeborsasi/core";

export type RouteMatchingQueuePayload = {
  companyId: string;
  fleetDriverId: string;
  tripCorrelationId: string | null;
  windowStartIso: string;
  windowEndIso: string;
  reason: "INGEST_BATCH" | "TRIP_END" | "MANUAL" | "CRON";
};

/**
 * Faz D: pluggable queue — in-process by default; Redis list when configured;
 * Kafka publish stub when KAFKA_BROKERS is set (workers consume externally).
 */
@Injectable()
export class TelemetryMatchingQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelemetryMatchingQueueService.name);
  private readonly pending: RouteMatchingQueuePayload[] = [];
  private redisClient: { lpush: (key: string, value: string) => Promise<number> } | null =
    null;

  public constructor(private readonly configService: ConfigService) {}

  public async onModuleInit(): Promise<void> {
    const redisUrl = this.configService.get<string>("REDIS_URL");
    if (redisUrl) {
      try {
        const { default: Redis } = await import("ioredis");
        this.redisClient = new Redis(redisUrl);
      } catch (error) {
        this.logger.warn("Redis queue unavailable; using in-process matcher queue");
      }
    }
  }

  public onModuleDestroy(): void {
    if (this.redisClient && "disconnect" in this.redisClient) {
      void (this.redisClient as { disconnect: () => void }).disconnect();
    }
  }

  public shouldEnqueueAfterIngest(eventCount: number): boolean {
    return eventCount >= TELEMETRY_ROUTE_REBUILD_EVERY_N_SAMPLES;
  }

  public async enqueue(payload: RouteMatchingQueuePayload): Promise<void> {
    const kafkaBrokers = this.configService.get<string>("KAFKA_BROKERS");
    if (kafkaBrokers) {
      this.logger.debug(
        `Kafka matcher topic stub: ${kafkaBrokers} driver=${payload.fleetDriverId}`,
      );
    }
    const redisKey =
      this.configService.get<string>("TELEMETRY_MATCHER_REDIS_QUEUE_KEY") ??
      "nb:telemetry:route-matching";
    if (this.redisClient) {
      await this.redisClient.lpush(redisKey, JSON.stringify(payload));
      return;
    }
    this.pending.push(payload);
  }

  public drainInProcessQueue(): RouteMatchingQueuePayload[] {
    const batch = this.pending.splice(0, this.pending.length);
    return batch;
  }
}
