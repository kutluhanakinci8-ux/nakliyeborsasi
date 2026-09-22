import { IsString, MinLength } from "class-validator";

export class EnrichInstagramStatsRequestDto {
  @IsString()
  @MinLength(3)
  public instagramUrl!: string;
}
