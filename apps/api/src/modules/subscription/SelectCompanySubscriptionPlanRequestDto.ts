import { IsString, MaxLength } from "class-validator";

export class SelectCompanySubscriptionPlanRequestDto {
  @IsString()
  @MaxLength(64)
  public planCode!: string;
}
