import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import type Redis from "ioredis";
import { MessageThreadEntity } from "../../infrastructure/database/entities/MessageThreadEntity";
import { RedisConnectionProvider } from "../../infrastructure/redis/RedisConnectionProvider";
import { MessagingExpoPushService } from "./MessagingExpoPushService";
import { MessagingThreadParticipantService } from "./MessagingThreadParticipantService";
import { MessagingWebPushService } from "./MessagingWebPushService";

@Injectable()
export class MessagingWebRtcIncomingCallNotifyService {
  private readonly logger = new Logger(MessagingWebRtcIncomingCallNotifyService.name);
  private readonly redis: Redis;

  public constructor(
    redisConnectionProvider: RedisConnectionProvider,
    private readonly participantService: MessagingThreadParticipantService,
    private readonly messagingExpoPushService: MessagingExpoPushService,
    private readonly messagingWebPushService: MessagingWebPushService,
    @InjectRepository(MessageThreadEntity)
    private readonly messageThreadRepository: Repository<MessageThreadEntity>,
  ) {
    this.redis = redisConnectionProvider.getClient();
  }

  public async notifyIncomingInvite(params: {
    threadId: string;
    fromUserId: string;
    fromCompanyId: string;
    media: "audio" | "video";
  }): Promise<void> {
    const dedupeKey = `messaging:webrtc:ring:sent:${params.threadId}:${params.fromUserId}`;
    const set = await this.redis.set(dedupeKey, "1", "EX", 45, "NX");
    if (set !== "OK") {
      return;
    }
    const thread = await this.messageThreadRepository.findOne({
      where: { id: params.threadId },
    });
    const companyIds = await this.participantService.listParticipants(
      params.threadId,
    );
    const title =
      params.media === "audio" ? "Gelen sesli görüşme" : "Gelen görüntülü görüşme";
    const body = "Sohbetten aramayı kabul edebilirsiniz.";
    for (const companyId of companyIds) {
      if (companyId === params.fromCompanyId) {
        continue;
      }
      await this.messagingExpoPushService.notifyMeetIncomingCall({
        companyId,
        threadId: params.threadId,
        title,
        body,
        freightListingId: thread?.freightListingId ?? null,
      });
      await this.messagingWebPushService.notifyMeetIncomingCall({
        companyId,
        threadId: params.threadId,
        title,
        body,
        freightListingId: thread?.freightListingId ?? null,
      });
    }
    this.logger.log(`Incoming meet push thread=${params.threadId}`);
  }
}
