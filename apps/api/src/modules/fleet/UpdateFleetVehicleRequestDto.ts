import { IsNumber, IsOptional, IsString, Length, MaxLength, Min } from "class-validator";

export class UpdateFleetVehicleRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  public licensePlate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  public vin?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  public equipmentTypeCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  public payloadCapacityTonnes?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  public statusCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  public internalFleetNumber?: string | null;
}
