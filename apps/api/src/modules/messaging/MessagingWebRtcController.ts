import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { AuthenticatedUserParam } from "../auth/AuthenticatedUserParam";
import { MESSAGING_WEBRTC_MAX_PARTICIPANTS } from "./messagingWebRtcConstants";
import { resolveMessagingWebRtcIceServers } from "./messagingWebRtcIceConfig";
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
  ) {}

  @Get("config")
  public async getConfig() {
    const relay = await this.signalingService.isRelayAvailable();
    return {
      iceServers: resolveMessagingWebRtcIceServers(),
      signaling: relay ? "redis_relay" : "unavailable",
      maxParticipants: MESSAGING_WEBRTC_MAX_PARTICIPANTS,
      meshMode: "p2p",
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
