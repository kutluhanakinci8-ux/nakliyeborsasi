import { IsOptional, IsUUID } from "class-validator";

export class AssignFleetToAuctionRequestDto {
  @IsUUID()
  public fleetVehicleId!: string;

  @IsOptional()
  @IsUUID()
  public fleetDriverId?: string;
}
