import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export const MESSAGING_WEBRTC_SIGNAL_TYPES = [
  "offer",
  "answer",
  "ice",
  "hangup",
  "invite",
] as const;

export class PostMessagingWebRtcSignalRequestDto {
  @IsIn(MESSAGING_WEBRTC_SIGNAL_TYPES)
  public type!: (typeof MESSAGING_WEBRTC_SIGNAL_TYPES)[number];

  @IsString()
  @MinLength(1)
  @MaxLength(65536)
  public payload!: string;

  /** Mesh: offer/answer/ice/hangup alıcısı (3 kişiye kadar). Boş = eski 1:1 yayın. */
  @IsOptional()
  @IsUUID()
  public targetUserId?: string;
}

export class ListMessagingWebRtcSignalsQueryDto {
  @IsOptional()
  @IsUUID()
  public afterId?: string;
}
