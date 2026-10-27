import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class PostMessagingWebRtcRecordingArchiveRequestDto {
  @IsInt()
  @Min(1)
  @Max(8 * 60 * 60)
  public durationSeconds!: number;

  @IsIn(["audio", "video"])
  public media!: "audio" | "video";

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public filename?: string;

  /** Opsiyonel küçük .webm (sunucu arşivi); boyut API limitine tabidir. */
  @IsOptional()
  @IsString()
  @MinLength(8)
  public contentBase64?: string;

  /** KVKK — dosya yüklerken zorunlu. */
  @IsOptional()
  @IsBoolean()
  public consentAcknowledged?: boolean;
}
