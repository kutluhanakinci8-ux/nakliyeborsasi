import { ArrayMaxSize, IsArray, IsString } from "class-validator";

export class UpdateMailCampaignTagsRequestDto {
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  public tags!: string[];
}
