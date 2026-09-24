import { Injectable } from "@nestjs/common";

export type OutboxDrainResult = {
  processed: number;
  sent: number;
  failed: number;
};

export type EmailOutboxOperationsSnapshot = {
  lastDrainAt: string | null;
  lastDrain: OutboxDrainResult | null;
  lastDrainError: string | null;
  processorIntervalSeconds: number;
};

const PROCESSOR_INTERVAL_SECONDS = 30;

@Injectable()
export class EmailOutboxOperationsService {
  private lastDrainAt: Date | null = null;
  private lastDrain: OutboxDrainResult | null = null;
  private lastDrainError: string | null = null;

  public recordDrain(result: OutboxDrainResult): void {
    this.lastDrainAt = new Date();
    this.lastDrain = result;
    this.lastDrainError = null;
  }

  public recordDrainError(message: string): void {
    this.lastDrainError = message;
    this.lastDrainAt = new Date();
  }

  public getSnapshot(): EmailOutboxOperationsSnapshot {
    return {
      lastDrainAt: this.lastDrainAt?.toISOString() ?? null,
      lastDrain: this.lastDrain,
      lastDrainError: this.lastDrainError,
      processorIntervalSeconds: PROCESSOR_INTERVAL_SECONDS,
    };
  }
}
