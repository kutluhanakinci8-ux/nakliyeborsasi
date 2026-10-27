import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { AuthenticatedUserParam } from "../auth/AuthenticatedUserParam";
import { MESSAGING_WEBRTC_MAX_PARTICIPANTS } from "./messagingWebRtcConstants";
import { summarizeMessagingWebRtcMeetCapacity } from "./messagingWebRtcMeetCapacity";
import { probeMessagingWebRtcSfuBackend } from "./messagingWebRtcSfuBackend";
import { MessagingWebRtcNativeBridgeService } from "./MessagingWebRtcNativeBridgeService";
import { PostMessagingWebRtcNativeBridgeHandshakeDto } from "./MessagingWebRtcNativeBridgeRequestDto";
import {
  resolveMessagingWebRtcIceServers,
  summarizeMessagingWebRtcIceCaps,
} from "./messagingWebRtcIceConfig";
import { MessagingWebRtcMeetOverflowIntentService } from "./MessagingWebRtcMeetOverflowIntentService";
import { MessagingWebRtcMeetSfuSessionService } from "./MessagingWebRtcMeetSfuSessionService";
import { MessagingWebRtcMeetRecordingArchiveService } from "./MessagingWebRtcMeetRecordingArchiveService";
import { MessagingWebRtcMeetScheduleService } from "./MessagingWebRtcMeetScheduleService";
import { PostMessagingWebRtcOverflowIntentRequestDto } from "./MessagingWebRtcOverflowIntentRequestDto";
import { PostMessagingWebRtcSfuSessionRequestDto } from "./MessagingWebRtcSfuSessionRequestDto";
import { PostMessagingWebRtcRecordingArchiveRequestDto } from "./MessagingWebRtcRecordingRequestDto";
import { UpsertMessagingWebRtcScheduleRequestDto } from "./MessagingWebRtcScheduleRequestDto";
import {
  enrichTurnMonitorWithIceCaps,
  probeMessagingWebRtcTurnMonitor,
} from "./messagingWebRtcTurnMonitor";
import { MessagingWebRtcSignalingService } from "./MessagingWebRtcSignalingService";
import {
  ListMessagingWebRtcSignalsQueryDto,
  PostMessagingWebRtcSignalRequestDto,
} from "./MessagingWebRtcSignalingRequestDto";

@Controller("messaging/webrtc")
@UseGuards(JwtAuthenticationGuard)
export class MessagingWebRtcController {
  public constructor(
    private readonly signalingService: MessagingWebRtcSignalingService,
    private readonly meetScheduleService: MessagingWebRtcMeetScheduleService,
    private readonly meetRecordingArchiveService: MessagingWebRtcMeetRecordingArchiveService,
    private readonly meetOverflowIntentService: MessagingWebRtcMeetOverflowIntentService,
    private readonly meetSfuSessionService: MessagingWebRtcMeetSfuSessionService,
    private readonly nativeBridgeService: MessagingWebRtcNativeBridgeService,
  ) {}

  @Get("config")
  public async getConfig() {
    const relay = await this.signalingService.isRelayAvailable();
    const iceCaps = summarizeMessagingWebRtcIceCaps();
    const turnMonitor = enrichTurnMonitorWithIceCaps(
      await probeMessagingWebRtcTurnMonitor(),
      iceCaps.turnCredentialsConfigured,
    );
    const capacity = summarizeMessagingWebRtcMeetCapacity();
    const sfuBackend = await probeMessagingWebRtcSfuBackend();
    return {
      iceServers: resolveMessagingWebRtcIceServers(),
      signaling: relay ? "redis_relay" : "unavailable",
      maxParticipants: capacity.effectiveMaxParticipants,
      meshMode: "p2p",
      capacity,
      sfuBackend,
      iceCaps,
      turnMonitor,
      maxRecordingArchiveBytes:
        this.meetRecordingArchiveService.maxArchiveBytes(),
    };
  }

  @Get("sfu/status")
  public async getSfuBackendStatus() {
    const sfuBackend = await probeMessagingWebRtcSfuBackend();
    return { sfuBackend };
  }

  @Get("native-bridge/config")
  public getNativeBridgeConfig() {
    return { config: this.nativeBridgeService.getConfig() };
  }

  @Post("native-bridge/handshake")
  public async postNativeBridgeHandshake(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: PostMessagingWebRtcNativeBridgeHandshakeDto,
  ) {
    const handshake = await this.nativeBridgeService.handshake(user, {
      platform: body.platform,
      appVersion: body.appVersion,
    });
    return { ok: true, ...handshake };
  }

  @Get("capacity")
  public getCapacityPolicy() {
    return { capacity: summarizeMessagingWebRtcMeetCapacity() };
  }

  @Get("threads/:threadId/sfu/session")
  public async getSfuSession(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("threadId") threadId: string,
  ) {
    const join = await this.meetSfuSessionService.getActiveSession(user, threadId);
    return { join };
  }

  @Post("threads/:threadId/sfu/session")
  public async postSfuSession(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("threadId") threadId: string,
    @Body() body: PostMessagingWebRtcSfuSessionRequestDto,
  ) {
    const join = await this.meetSfuSessionService.createOrRefreshSession(
      user,
      threadId,
      body.media ?? "video",
    );
    return { ok: true, join };
  }

  @Delete("threads/:threadId/sfu/session")
  public async deleteSfuSession(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("threadId") threadId: string,
  ) {
    await this.meetSfuSessionService.clearSession(user, threadId);
    return { ok: true };
  }

  @Get("threads/:threadId/overflow-intent")
  public async getOverflowIntentStatus(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("threadId") threadId: string,
  ) {
    const status = await this.meetOverflowIntentService.getThreadStatus(
      user,
      threadId,
    );
    return { status };
  }

  @Post("threads/:threadId/overflow-intent")
  public async postOverflowIntent(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("threadId") threadId: string,
    @Body() body: PostMessagingWebRtcOverflowIntentRequestDto,
  ) {
    const intent = await this.meetOverflowIntentService.registerIntent(
      user,
      threadId,
      body.note,
    );
    return { ok: true, intent };
  }

  @Get("threads/:threadId/schedule")
  public async getSchedule(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("threadId") threadId: string,
  ) {
    const schedule = await this.meetScheduleService.getSchedule(user, threadId);
    return { schedule };
  }

  @Put("threads/:threadId/schedule")
  public async upsertSchedule(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("threadId") threadId: string,
    @Body() body: UpsertMessagingWebRtcScheduleRequestDto,
  ) {
    const schedule = await this.meetScheduleService.upsertSchedule(
      user,
      threadId,
      {
        scheduledAt: body.scheduledAt,
        media: body.media,
        note: body.note,
      },
    );
    return { ok: true, schedule };
  }

  @Delete("threads/:threadId/schedule")
  public async clearSchedule(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("threadId") threadId: string,
  ) {
    await this.meetScheduleService.clearSchedule(user, threadId);
    return { ok: true };
  }

  @Get("threads/:threadId/recordings")
  public async listRecordings(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("threadId") threadId: string,
  ) {
    const archives = await this.meetRecordingArchiveService.listArchives(
      user,
      threadId,
    );
    return { archives };
  }

  @Post("threads/:threadId/recordings")
  public async createRecordingArchive(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("threadId") threadId: string,
    @Body() body: PostMessagingWebRtcRecordingArchiveRequestDto,
  ) {
    const archive = await this.meetRecordingArchiveService.createArchive(
      user,
      threadId,
      {
        durationSeconds: body.durationSeconds,
        media: body.media,
        filename: body.filename,
        contentBase64: body.contentBase64,
        consentAcknowledged: body.consentAcknowledged,
      },
    );
    return { ok: true, archive };
  }

  @Get("threads/:threadId/recordings/export")
  public async exportRecordingManifest(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("threadId") threadId: string,
  ) {
    const manifest = await this.meetRecordingArchiveService.exportManifest(
      user,
      threadId,
    );
    return { manifest };
  }

  @Get("threads/:threadId/recordings/:archiveId")
  public async getRecordingArchive(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("threadId") threadId: string,
    @Param("archiveId") archiveId: string,
  ) {
    const payload = await this.meetRecordingArchiveService.fetchArchiveBlob(
      user,
      threadId,
      archiveId,
    );
    return {
      archive: payload.meta,
      contentBase64: payload.base64,
    };
  }

  @Get("threads/:threadId/room")
  public async getRoom(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("threadId") threadId: string,
  ) {
    const room = await this.signalingService.getRoomSnapshot(user, threadId);
    return { room };
  }

  @Post("threads/:threadId/room/join")
  public async joinRoom(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("threadId") threadId: string,
  ) {
    const room = await this.signalingService.joinRoom(user, threadId);
    return { ok: true, room };
  }

  @Post("threads/:threadId/room/leave")
  public async leaveRoom(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("threadId") threadId: string,
  ) {
    const room = await this.signalingService.leaveRoom(user, threadId);
    return { ok: true, room };
  }

  @Post("threads/:threadId/signals")
  public async postSignal(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("threadId") threadId: string,
    @Body() body: PostMessagingWebRtcSignalRequestDto,
  ) {
    const signal = await this.signalingService.postSignal({
      user,
      threadId,
      type: body.type,
      payload: body.payload,
      targetUserId: body.targetUserId ?? null,
    });
    return { ok: true, signal };
  }

  @Get("threads/:threadId/signals")
  public async listSignals(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("threadId") threadId: string,
    @Query() query: ListMessagingWebRtcSignalsQueryDto,
  ) {
    const signals = await this.signalingService.listSignals({
      user,
      threadId,
      afterId: query.afterId ?? null,
    });
    return { signals };
  }
}
