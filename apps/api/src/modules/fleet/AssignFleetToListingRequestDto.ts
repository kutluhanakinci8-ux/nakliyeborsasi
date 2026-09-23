import { IsOptional, IsUUID } from "class-validator";

export class AssignFleetToListingRequestDto {
  @IsUUID()
  public fleetVehicleId!: string;

  @IsOptional()
  @IsUUID()
  public fleetDriverId?: string;
}
