import { BadRequestException, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type Redis from "ioredis";
import type { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { RedisConnectionProvider } from "../../infrastructure/redis/RedisConnectionProvider";
import { MESSAGING_WEBRTC_MAX_PARTICIPANTS } from "./messagingWebRtcConstants";
import { resolveMessagingWebRtcIceServers } from "./messagingWebRtcIceConfig";
import { MessagingThreadApplicationService } from "./MessagingThreadApplicationService";
import { MessagingWebRtcNativeBridgeService } from "./MessagingWebRtcNativeBridgeService";

const PILOT_TTL_SECONDS = 2 * 60 * 60;

export type WebRtcNativeMeshPilotSession = {
  pilotSessionId: string;
  threadId: string;
  userId: string;
  companyId: string;
  mode: "native_mesh_pilot";
  maxParticipants: number;
  joinToken: string;
  iceServers: ReturnType<typeof resolveMessagingWebRtcIceServers>;
  signalingRelay: "redis_relay";
  createdAt: string;
  expiresAt: string;
  hintTr: string;
};

@Injectable()
export class MessagingWebRtcNativeMeshPilotService {
  private readonly redis: Redis;

  public constructor(
    redisConnectionProvider: RedisConnectionProvider,
    private readonly messagingThreadApplicationService: MessagingThreadApplicationService,
    private readonly nativeBridgeService: MessagingWebRtcNativeBridgeService,
  ) {
    this.redis = redisConnectionProvider.getClient();
  }

  public async getSession(
    user: AuthenticatedUserContext,
    threadId: string,
  ): Promise<WebRtcNativeMeshPilotSession | null> {
    await this.messagingThreadApplicationService.assertThreadParticipantForSignaling(
      user,
      threadId,
    );
    const raw = await this.redis.get(this.sessionKey(threadId));
    if (!raw) {
      return null;
    }
    try {
      const session = JSON.parse(raw) as WebRtcNativeMeshPilotSession;
      if (Date.parse(session.expiresAt) <= Date.now()) {
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  public async createSession(
    user: AuthenticatedUserContext,
    threadId: string,
  ): Promise<WebRtcNativeMeshPilotSession> {
    await this.assertNativeModuleEligible(user);
    await this.messagingThreadApplicationService.assertThreadParticipantForSignaling(
      user,
      threadId,
    );
    const existing = await this.getSession(user, threadId);
    if (existing) {
      return existing;
    }
    const now = Date.now();
    const session: WebRtcNativeMeshPilotSession = {
      pilotSessionId: randomUUID(),
      threadId,
      userId: user.userId,
      companyId: user.companyId,
      mode: "native_mesh_pilot",
      maxParticipants: MESSAGING_WEBRTC_MAX_PARTICIPANTS,
      joinToken: randomUUID(),
      iceServers: resolveMessagingWebRtcIceServers(),
      signalingRelay: "redis_relay",
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + PILOT_TTL_SECONDS * 1000).toISOString(),
      hintTr:
        "RN WebRTC dev client: bu oturum joinToken ile mesh sinyal (redis_relay) kullanır; web mesh pilotu paralel kalabilir.",
    };
    await this.redis.set(
      this.sessionKey(threadId),
      JSON.stringify(session),
      "EX",
      PILOT_TTL_SECONDS,
    );
    await this.redis.sadd(this.globalSetKey(), session.pilotSessionId);
    await this.redis.expire(this.globalSetKey(), PILOT_TTL_SECONDS);
    return session;
  }

  public async countSessions(): Promise<number> {
    return await this.redis.scard(this.globalSetKey());
  }

  private async assertNativeModuleEligible(
    user: AuthenticatedUserContext,
  ): Promise<void> {
    const caps = await this.nativeBridgeService.getCapabilities(user);
    const media = this.nativeBridgeService.resolveMediaModuleSnapshot(caps);
    if (media.rnWebRtcStatus !== "linked_dev_client") {
      throw new BadRequestException(
        "Native mesh pilot yalnızca react-native-webrtc dev client (capabilities: linked_dev_client) ile kullanılabilir.",
      );
    }
  }

  private sessionKey(threadId: string): string {
    return `messaging:webrtc:native-mesh-pilot:${threadId}`;
  }

  private globalSetKey(): string {
    return "messaging:webrtc:native-mesh-pilot:global";
  }
}
