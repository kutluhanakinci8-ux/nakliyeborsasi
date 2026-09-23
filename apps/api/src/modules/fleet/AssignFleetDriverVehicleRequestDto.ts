import { IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class AssignFleetDriverVehicleRequestDto {
  @IsUUID()
  public driverId!: string;

  @IsUUID()
  public vehicleId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  public assignmentTypeCode?: string;
}
