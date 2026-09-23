import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { TelemetryDevicePlatformCode } from "@nakliyeborsasi/core";

const PLATFORMS = Object.values(TelemetryDevicePlatformCode);

export class EnrollTelemetryDeviceRequestDto {
  @IsIn(PLATFORMS)
  public platformCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public deviceLabel?: string;
}
