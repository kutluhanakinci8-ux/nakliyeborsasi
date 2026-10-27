import { IsIn, IsOptional } from "class-validator";
import type {
  NativeSfuMediaMode,
  RnWebRtcModuleStatus,
} from "./messagingWebRtcNativeMediaModule";

export class PostMessagingWebRtcNativeBridgeCapabilitiesDto {
  @IsIn(["absent", "linked_dev_client"])
  public rnWebRtcModule!: RnWebRtcModuleStatus;

  @IsOptional()
  @IsIn(["webview_embed", "native_planned"])
  public sfuMediaMode?: NativeSfuMediaMode;
}
