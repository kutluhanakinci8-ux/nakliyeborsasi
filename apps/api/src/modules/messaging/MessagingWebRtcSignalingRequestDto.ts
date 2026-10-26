import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class PostMessagingWebRtcSignalRequestDto {
  @IsIn(["offer", "answer", "ice"])
  public type!: "offer" | "answer" | "ice";

  @IsString()
  @MinLength(1)
  @MaxLength(65536)
  public payload!: string;
}

export class ListMessagingWebRtcSignalsQueryDto {
  @IsOptional()
  @IsUUID()
  public afterId?: string;
}
