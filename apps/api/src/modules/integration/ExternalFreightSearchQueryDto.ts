import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { Type } from "class-transformer";
import {
  EquipmentTypeCode,
  GeographicMarketCode,
  IntegrationProviderCode,
} from "@nakliyeborsasi/core";

export class ExternalFreightSearchQueryDto {
  @IsOptional()
  @IsString()
  public originCountryCode?: string;

  @IsOptional()
  @IsString()
  public destinationCountryCode?: string;

  @IsOptional()
  @IsString()
  public originCityQuery?: string;

  @IsOptional()
  @IsString()
  public destinationCityQuery?: string;

  @IsOptional()
  @IsEnum(EquipmentTypeCode)
  public equipmentType?: EquipmentTypeCode;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  public minimumWeightTonnes?: number;

  @IsOptional()
  @IsEnum(GeographicMarketCode)
  public marketScope?: GeographicMarketCode;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  public limit?: number;

  @IsOptional()
  @IsEnum(IntegrationProviderCode, { each: true })
  public providers?: IntegrationProviderCode[];
}
