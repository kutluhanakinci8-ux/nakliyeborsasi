import { IsOptional, IsString, MaxLength } from "class-validator";

export class PostMessagingWebRtcOverflowIntentRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(240)
  public note?: string;
}
