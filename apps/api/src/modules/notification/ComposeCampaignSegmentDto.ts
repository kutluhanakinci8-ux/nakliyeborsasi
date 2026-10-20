import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

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

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  public referansAllowlist?: string[];
}
