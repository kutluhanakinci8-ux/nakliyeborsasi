import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import {
  EquipmentTypeCode,
  GeographicMarketCode,
} from "@nakliyeborsasi/core";

export class CreatePlatformFreightListingDto {
  @IsString()
  public originCountryCode!: string;

  @IsString()
  public originCityName!: string;

  @IsOptional()
  @IsString()
  public originPlaceName?: string;

  @IsOptional()
  @IsString()
  public originPlaceKindCode?: string;

  @IsString()
  public destinationCountryCode!: string;

  @IsString()
  public destinationCityName!: string;

  @IsOptional()
  @IsString()
  public destinationPlaceName?: string;

  @IsOptional()
  @IsString()
  public destinationPlaceKindCode?: string;

  @IsEnum(EquipmentTypeCode)
  public equipmentType!: EquipmentTypeCode;

  @IsNumber()
  @Min(0.1)
  public weightTonnes!: number;

  @IsString()
  public loadingDateStart!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  public priceAmount?: number;

  @IsOptional()
  @IsString()
  public priceCurrency?: string;

  @IsEnum(GeographicMarketCode)
  public marketScope!: GeographicMarketCode;
}
