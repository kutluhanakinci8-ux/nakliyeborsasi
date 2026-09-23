import { IsOptional, IsString, Length, MaxLength } from "class-validator";

export class CreateFleetDriverRequestDto {
  @IsString()
  @MaxLength(160)
  public displayName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(24)
  public primaryPhoneE164?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  public driverLicenseNumber?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  public driverLicenseCountryCode?: string;
}
