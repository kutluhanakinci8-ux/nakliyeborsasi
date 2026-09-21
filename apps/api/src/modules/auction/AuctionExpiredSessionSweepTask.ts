import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { AuctionSessionFinalizationService } from "./AuctionSessionFinalizationService";

@Injectable()
export class AuctionExpiredSessionSweepTask implements OnModuleInit, OnModuleDestroy {
  private sweepTimer: ReturnType<typeof setInterval> | null = null;

  public constructor(
    private readonly auctionSessionFinalizationService: AuctionSessionFinalizationService,
  ) {}

  public onModuleInit(): void {
    this.sweepTimer = setInterval(() => {
      void this.auctionSessionFinalizationService.closeAllExpiredOpenSessions();
    }, 60_000);
    void this.auctionSessionFinalizationService.closeAllExpiredOpenSessions();
  }

  public onModuleDestroy(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
  }
}
