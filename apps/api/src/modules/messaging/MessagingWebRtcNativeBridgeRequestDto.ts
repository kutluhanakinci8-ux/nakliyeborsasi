import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class PostMessagingWebRtcNativeBridgeHandshakeDto {
  @IsIn(["expo", "web", "capacitor"])
  public platform!: "expo" | "web" | "capacitor";

  @IsOptional()
  @IsString()
  @MaxLength(64)
  public appVersion?: string;
}
