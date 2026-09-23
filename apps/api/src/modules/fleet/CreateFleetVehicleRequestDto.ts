import { IsNumber, IsOptional, IsString, Length, MaxLength, Min } from "class-validator";

export class CreateFleetVehicleRequestDto {
  @IsString()
  @Length(2, 2)
  public registrationCountryCode!: string;

  @IsString()
  @MaxLength(32)
  public licensePlate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  public vin?: string;

  @IsString()
  @MaxLength(32)
  public equipmentTypeCode!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  public payloadCapacityTonnes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  public internalFleetNumber?: string;
}
