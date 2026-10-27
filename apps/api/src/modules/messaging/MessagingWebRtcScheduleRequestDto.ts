import { IsIn, IsISO8601, IsOptional, IsString, MaxLength } from "class-validator";

export class UpsertMessagingWebRtcScheduleRequestDto {
  @IsISO8601()
  public scheduledAt!: string;

  @IsIn(["audio", "video"])
  public media!: "audio" | "video";

  @IsOptional()
  @IsString()
  @MaxLength(240)
  public note?: string;
}
