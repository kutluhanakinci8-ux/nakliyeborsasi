import { IsString, MaxLength, MinLength } from "class-validator";

export class EnrichCompanyWebsiteRequestDto {
  @IsString()
  @MinLength(4)
  @MaxLength(512)
  public websiteUrl!: string;
}
