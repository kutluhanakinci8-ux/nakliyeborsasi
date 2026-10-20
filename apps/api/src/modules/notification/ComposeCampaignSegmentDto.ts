import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class ComposeCampaignSegmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  public referansPrefix?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public referansEquals?: string;

  @IsOptional()
  @IsBoolean()
  public requireMusteriAdi?: boolean;
}
