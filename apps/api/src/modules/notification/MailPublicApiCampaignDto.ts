import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { ComposeCampaignSegmentDto } from "./ComposeCampaignSegmentDto";

export class MailPublicApiCampaignRecipientDto {
  @IsEmail()
  @MaxLength(320)
  public email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public musteriAdi?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public referans?: string;
}

export class MailPublicApiCampaignDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(25)
  @ValidateNested({ each: true })
  @Type(() => MailPublicApiCampaignRecipientDto)
  public recipients!: MailPublicApiCampaignRecipientDto[];

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  public subject!: string;

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
  @IsInt()
  @Min(0)
  @Max(2000)
  public delayMsBetweenRecipients?: number;

  @IsOptional()
  @IsDateString()
  public scheduleAt?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  public recipientDomainAllowlist?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ComposeCampaignSegmentDto)
  public segment?: ComposeCampaignSegmentDto;

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
}
