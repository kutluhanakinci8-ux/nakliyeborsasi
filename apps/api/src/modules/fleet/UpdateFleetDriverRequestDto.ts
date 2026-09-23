import { IsOptional, IsString, Length, MaxLength } from "class-validator";

export class UpdateFleetDriverRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  public displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(24)
  public primaryPhoneE164?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  public driverLicenseNumber?: string | null;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  public driverLicenseCountryCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  public statusCode?: string;
}
