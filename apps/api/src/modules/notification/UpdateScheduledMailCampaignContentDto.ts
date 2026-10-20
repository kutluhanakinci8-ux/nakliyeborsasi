import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateScheduledMailCampaignContentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  public subject?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  public text?: string;

  @IsOptional()
  @IsString()
  public html?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  public subjectB?: string;
}
