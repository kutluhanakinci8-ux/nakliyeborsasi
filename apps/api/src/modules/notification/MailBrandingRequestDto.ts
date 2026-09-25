import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateMailBrandingRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  public logoUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public emailBrandTitle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public defaultFromDisplayName?: string | null;

  @IsOptional()
  @IsBoolean()
  public hidePlatformEmailChrome?: boolean;
}
