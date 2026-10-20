import { IsDateString, IsIn, IsOptional } from "class-validator";

export class CloneMailCampaignRequestDto {
  /** compose: yaz ekranına kopyala; schedule: yeni zamanlanmış kampanya. */
  @IsOptional()
  @IsIn(["compose", "schedule"])
  public mode?: "compose" | "schedule";

  @IsOptional()
  @IsDateString()
  public scheduleAt?: string;
}
