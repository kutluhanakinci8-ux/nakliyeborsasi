import { CompanyParticipantTypeCode } from "@nakliyeborsasi/core";
import { IsEmail, IsEnum, IsString, MaxLength, MinLength } from "class-validator";

export class RegisterCompanyUserRequestDto {
  @IsEmail()
  public emailAddress!: string;

  @IsString()
  @MinLength(8)
  public password!: string;

  @IsString()
  @MinLength(2)
  public displayName!: string;

  @IsString()
  @MinLength(2)
  public companyLegalName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(2)
  public companyCountryCode!: string;

  @IsEnum(CompanyParticipantTypeCode)
  public companyParticipantTypeCode!: CompanyParticipantTypeCode;
}
