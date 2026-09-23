import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { RouteReconstructionService } from "./RouteReconstructionService";
import { TelemetryMatchingQueueService } from "./TelemetryMatchingQueueService";

@Injectable()
export class RouteMatchingJobRunner implements OnModuleInit {
  private readonly logger = new Logger(RouteMatchingJobRunner.name);
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  public constructor(
    private readonly routeReconstructionService: RouteReconstructionService,
    private readonly telemetryMatchingQueueService: TelemetryMatchingQueueService,
  ) {}

  public onModuleInit(): void {
    this.intervalHandle = setInterval(() => {
      void this.tick();
    }, 30_000);
  }

  private async tick(): Promise<void> {
    const drained = this.telemetryMatchingQueueService.drainInProcessQueue();
    for (const payload of drained) {
      await this.routeReconstructionService.enqueueRebuildJob(payload);
    }
    await this.routeReconstructionService.processPendingJobs(8);
  }
}
