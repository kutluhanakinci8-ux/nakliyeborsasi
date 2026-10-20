import { Type } from "class-transformer";
import { ComposeMergeContextDto } from "./ComposeMergeContextDto";
import { ComposeMailAttachmentDto } from "./ComposeMailRequestDto";
import { ComposeCampaignRecipientDto } from "./ComposeCampaignRecipientDto";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
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
}
