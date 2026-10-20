import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsString, IsUUID } from "class-validator";

export class BulkCancelMailCampaignsRequestDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(25)
  @IsString({ each: true })
  @IsUUID("4", { each: true })
  public campaignIds!: string[];
}
