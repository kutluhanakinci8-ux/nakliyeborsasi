import { IsString, MinLength } from "class-validator";

export class RescheduleMailCampaignRequestDto {
  @IsString()
  @MinLength(10)
  public scheduleAt!: string;
}
