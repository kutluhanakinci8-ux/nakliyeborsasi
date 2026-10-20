import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  ValidateNested,
} from "class-validator";
import { ComposeCampaignRecipientDto } from "./ComposeCampaignRecipientDto";
import { ComposeCampaignSegmentDto } from "./ComposeCampaignSegmentDto";
import { ComposeMergeContextDto } from "./ComposeMergeContextDto";

export class ComposeCampaignPreviewSegmentDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(25)
  @ValidateNested({ each: true })
  @Type(() => ComposeCampaignRecipientDto)
  public recipients!: ComposeCampaignRecipientDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ComposeMergeContextDto)
  public merge?: ComposeMergeContextDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  public recipientDomainAllowlist?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ComposeCampaignSegmentDto)
  public segment?: ComposeCampaignSegmentDto;
}
