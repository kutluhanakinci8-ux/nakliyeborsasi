import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type Redis from "ioredis";
import type { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { RedisConnectionProvider } from "../../infrastructure/redis/RedisConnectionProvider";
import { summarizeMessagingWebRtcNativeBridge } from "./messagingWebRtcNativeBridge";

const HANDSHAKE_TTL_SECONDS = 24 * 60 * 60;

export type WebRtcNativeBridgeHandshakeRecord = {
  bridgeId: string;
  userId: string;
  companyId: string;
  platform: "expo" | "web" | "capacitor";
  appVersion?: string;
  createdAt: string;
};

@Injectable()
export class MessagingWebRtcNativeBridgeService {
  private readonly redis: Redis;

  public constructor(redisConnectionProvider: RedisConnectionProvider) {
    this.redis = redisConnectionProvider.getClient();
  }

  public getConfig() {
    return summarizeMessagingWebRtcNativeBridge();
  }

  public async handshake(
    user: AuthenticatedUserContext,
    input: { platform: "expo" | "web" | "capacitor"; appVersion?: string },
  ): Promise<{
    bridgeId: string;
    config: ReturnType<typeof summarizeMessagingWebRtcNativeBridge>;
    expiresInSeconds: number;
  }> {
    const bridgeId = randomUUID();
    const record: WebRtcNativeBridgeHandshakeRecord = {
      bridgeId,
      userId: user.userId,
      companyId: user.companyId,
      platform: input.platform,
      ...(input.appVersion ? { appVersion: input.appVersion.slice(0, 64) } : {}),
      createdAt: new Date().toISOString(),
    };
    const globalMember = `${user.userId}:${bridgeId}`;
    await this.redis
      .multi()
      .set(
        this.userKey(user.userId),
        JSON.stringify(record),
        "EX",
        HANDSHAKE_TTL_SECONDS,
      )
      .sadd(this.globalSetKey(), globalMember)
      .expire(this.globalSetKey(), HANDSHAKE_TTL_SECONDS)
      .exec();
    return {
      bridgeId,
      config: summarizeMessagingWebRtcNativeBridge(),
      expiresInSeconds: HANDSHAKE_TTL_SECONDS,
    };
  }

  public async countHandshakes(): Promise<number> {
    return await this.redis.scard(this.globalSetKey());
  }

  private userKey(userId: string): string {
    return `messaging:webrtc:native-bridge:user:${userId}`;
  }

  private globalSetKey(): string {
    return "messaging:webrtc:native-bridge:global";
  }
}
