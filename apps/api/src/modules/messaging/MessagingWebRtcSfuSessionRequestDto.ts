import { IsIn, IsOptional } from "class-validator";

export class PostMessagingWebRtcSfuSessionRequestDto {
  @IsOptional()
  @IsIn(["audio", "video"])
  public media?: "audio" | "video";
}
