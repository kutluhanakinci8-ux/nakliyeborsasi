import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MessageThreadEntity } from "../../infrastructure/database/entities/MessageThreadEntity";
import { MessagingExpoPushService } from "./MessagingExpoPushService";
import { MessagingThreadParticipantService } from "./MessagingThreadParticipantService";
import { MessagingWebPushService } from "./MessagingWebPushService";
import { MessagingWebRtcMeetScheduleService } from "./MessagingWebRtcMeetScheduleService";

@Injectable()
export class MessagingWebRtcMeetReminderService {
  private readonly logger = new Logger(MessagingWebRtcMeetReminderService.name);

  public constructor(
    private readonly meetScheduleService: MessagingWebRtcMeetScheduleService,
    private readonly participantService: MessagingThreadParticipantService,
    private readonly messagingExpoPushService: MessagingExpoPushService,
    private readonly messagingWebPushService: MessagingWebPushService,
    @InjectRepository(MessageThreadEntity)
    private readonly messageThreadRepository: Repository<MessageThreadEntity>,
  ) {}

  public async runReminderSweep(): Promise<void> {
    const now = Date.now();
    const soonStart = await this.meetScheduleService.listThreadIdsScheduledBetween(
      now - 60 * 1000,
      now + 60 * 1000,
    );
    for (const threadId of soonStart) {
      await this.dispatchReminder(threadId, "start");
    }
    const soon15 = await this.meetScheduleService.listThreadIdsScheduledBetween(
      now + 14 * 60 * 1000,
      now + 16 * 60 * 1000,
    );
    for (const threadId of soon15) {
      await this.dispatchReminder(threadId, "t15");
    }
  }

  private async dispatchReminder(
    threadId: string,
    kind: "t15" | "start",
  ): Promise<void> {
    const schedule = await this.meetScheduleService.getScheduleRaw(threadId);
    if (!schedule) {
      return;
    }
    if (await this.meetScheduleService.isReminderSent(threadId, kind)) {
      return;
    }
    const thread = await this.messageThreadRepository.findOne({
      where: { id: threadId },
    });
    const companyIds = await this.participantService.listParticipants(threadId);
    const mediaLabel = schedule.media === "audio" ? "Sesli" : "Görüntülü";
    const at = new Date(schedule.scheduledAt);
    const timeLabel = at.toLocaleString("tr-TR", {
      dateStyle: "short",
      timeStyle: "short",
    });
    const title =
      kind === "start" ? "Planlı görüşme başlıyor" : "Planlı görüşme hatırlatma";
    const body =
      kind === "start"
        ? `${mediaLabel} görüşme şimdi — ${timeLabel}`
        : `15 dk sonra ${mediaLabel.toLowerCase()} görüşme — ${timeLabel}`;
    for (const companyId of companyIds) {
      await this.messagingExpoPushService.notifyMeetScheduleReminder({
        companyId,
        threadId,
        title,
        body,
        freightListingId: thread?.freightListingId ?? null,
      });
      await this.messagingWebPushService.notifyMeetScheduleReminder({
        companyId,
        threadId,
        title,
        body,
        freightListingId: thread?.freightListingId ?? null,
      });
    }
    await this.meetScheduleService.markReminderSent(threadId, kind);
    this.logger.log(`Meet reminder ${kind} thread=${threadId}`);
  }
}
