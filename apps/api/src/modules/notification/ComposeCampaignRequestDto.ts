import { Type } from "class-transformer";
import { ComposeMergeContextDto } from "./ComposeMergeContextDto";
import { ComposeMailAttachmentDto } from "./ComposeMailRequestDto";
import { ComposeCampaignRecipientDto } from "./ComposeCampaignRecipientDto";
import { ComposeCampaignSegmentDto } from "./ComposeCampaignSegmentDto";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

export class ComposeCampaignRequestDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(25)
  @ValidateNested({ each: true })
  @Type(() => ComposeCampaignRecipientDto)
  public recipients!: ComposeCampaignRecipientDto[];

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  public subject!: string;

  /** A/B: tek numaralı alıcılar (2., 4. …) bu konuyu alır. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  public subjectB?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200_000)
  public text!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500_000)
  public html?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComposeMailAttachmentDto)
  public attachments?: ComposeMailAttachmentDto[];

  /** Tüm alıcılar için varsayılan merge (satırda yoksa). */
  @IsOptional()
  @ValidateNested()
  @Type(() => ComposeMergeContextDto)
  public merge?: ComposeMergeContextDto;

  /** Alıcılar arası bekleme (0–2000 ms) — SMTP burst yumuşatma. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2000)
  public delayMsBetweenRecipients?: number;

  /** ISO 8601 — en az 1 dk, en fazla 7 gün sonrası. */
  @IsOptional()
  @IsDateString()
  public scheduleAt?: string;

  /** Örn. ["firma.com"] — yalnızca bu alan adlarına gönder. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  public recipientDomainAllowlist?: string[];

  /** Zamanlanmış gönderimde hesap e-postanıza özet bildirimi. */
  @IsOptional()
  @IsBoolean()
  public notifyCreator?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => ComposeCampaignSegmentDto)
  public segment?: ComposeCampaignSegmentDto;

  /** Gönderimden önce hatırlatma (5–1440 dk); zamanlama ile birlikte. */
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  public reminderMinutesBefore?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(32, { each: true })
  public tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  public clientReference?: string;
}
