import { IsEnum, IsOptional, IsString } from "class-validator";
import { GeographicMarketCode } from "@nakliyeborsasi/core";

export class PlatformFreightListingSearchQueryDto {
  @IsOptional()
  @IsString()
  public originCountryCode?: string;

  @IsOptional()
  @IsString()
  public destinationCountryCode?: string;

  @IsOptional()
  @IsEnum(GeographicMarketCode)
  public marketScope?: GeographicMarketCode;

  @IsOptional()
  @IsString()
  public lang?: string;
}
