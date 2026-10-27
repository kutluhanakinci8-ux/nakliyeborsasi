import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type Redis from "ioredis";
import type { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { RedisConnectionProvider } from "../../infrastructure/redis/RedisConnectionProvider";
import { summarizeMessagingWebRtcNativeBridge } from "./messagingWebRtcNativeBridge";
import type {
  MessagingWebRtcNativeMediaModuleSnapshot,
  NativeSfuMediaMode,
  RnWebRtcModuleStatus,
} from "./messagingWebRtcNativeMediaModule";
import { defaultNativeMediaModuleSnapshot } from "./messagingWebRtcNativeMediaModule";

const HANDSHAKE_TTL_SECONDS = 24 * 60 * 60;
const CAPABILITIES_TTL_SECONDS = 7 * 24 * 60 * 60;

export type WebRtcNativeBridgeHandshakeRecord = {
  bridgeId: string;
  userId: string;
  companyId: string;
  platform: "expo" | "web" | "capacitor";
  appVersion?: string;
  createdAt: string;
};

export type WebRtcNativeBridgeCapabilitiesRecord = {
  userId: string;
  companyId: string;
  rnWebRtcModule: RnWebRtcModuleStatus;
  sfuMediaMode: NativeSfuMediaMode;
  reportedAt: string;
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

  public async reportCapabilities(
    user: AuthenticatedUserContext,
    input: {
      rnWebRtcModule: RnWebRtcModuleStatus;
      sfuMediaMode?: NativeSfuMediaMode;
    },
  ): Promise<WebRtcNativeBridgeCapabilitiesRecord> {
    const record: WebRtcNativeBridgeCapabilitiesRecord = {
      userId: user.userId,
      companyId: user.companyId,
      rnWebRtcModule: input.rnWebRtcModule,
      sfuMediaMode: input.sfuMediaMode ?? "webview_embed",
      reportedAt: new Date().toISOString(),
    };
    await this.redis.set(
      this.capabilitiesKey(user.userId),
      JSON.stringify(record),
      "EX",
      CAPABILITIES_TTL_SECONDS,
    );
    if (input.rnWebRtcModule === "linked_dev_client") {
      await this.redis.incr(this.linkedModuleCounterKey());
    }
    return record;
  }

  public async getCapabilities(
    user: AuthenticatedUserContext,
  ): Promise<WebRtcNativeBridgeCapabilitiesRecord | null> {
    const raw = await this.redis.get(this.capabilitiesKey(user.userId));
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as WebRtcNativeBridgeCapabilitiesRecord;
    } catch {
      return null;
    }
  }

  public resolveMediaModuleSnapshot(
    record: WebRtcNativeBridgeCapabilitiesRecord | null,
  ): MessagingWebRtcNativeMediaModuleSnapshot {
    const base = defaultNativeMediaModuleSnapshot();
    if (!record) {
      return base;
    }
    return {
      ...base,
      rnWebRtcStatus: record.rnWebRtcModule,
      sfuMediaMode: record.sfuMediaMode,
    };
  }

  public async countLinkedDevClientReports(): Promise<number> {
    const raw = await this.redis.get(this.linkedModuleCounterKey());
    if (!raw) {
      return 0;
    }
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  }

  private capabilitiesKey(userId: string): string {
    return `messaging:webrtc:native-bridge:capabilities:${userId}`;
  }

  private linkedModuleCounterKey(): string {
    return "messaging:webrtc:native-bridge:rn-webrtc-linked-count";
  }

  private userKey(userId: string): string {
    return `messaging:webrtc:native-bridge:user:${userId}`;
  }

  private globalSetKey(): string {
    return "messaging:webrtc:native-bridge:global";
  }
}
