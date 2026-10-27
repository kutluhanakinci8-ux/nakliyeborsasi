import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { MessagingWebRtcMeetReminderService } from "./MessagingWebRtcMeetReminderService";

@Injectable()
export class MessagingWebRtcMeetReminderScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(MessagingWebRtcMeetReminderScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  public constructor(
    private readonly meetReminderService: MessagingWebRtcMeetReminderService,
  ) {}

  public onModuleInit(): void {
    if (process.env.MESSAGING_WEBRTC_MEET_REMINDER_JOB_ENABLED === "0") {
      return;
    }
    const intervalMs = Number.parseInt(
      process.env.MESSAGING_WEBRTC_MEET_REMINDER_INTERVAL_MS ?? "60000",
      10,
    );
    this.timer = setInterval(() => {
      void this.meetReminderService.runReminderSweep().catch((error) => {
        this.logger.warn(
          `Meet reminder sweep failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
    }, intervalMs);
    void this.meetReminderService.runReminderSweep().catch(() => undefined);
  }

  public onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
