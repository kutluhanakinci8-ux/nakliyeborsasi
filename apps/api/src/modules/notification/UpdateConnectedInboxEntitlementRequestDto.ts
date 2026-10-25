import { IsBoolean, IsInt, Max, Min } from "class-validator";

export class UpdateConnectedInboxEntitlementRequestDto {
  @IsBoolean()
  public premiumEnabled!: boolean;

  @IsInt()
  @Min(0)
  @Max(50)
  public maxConnectedAccounts!: number;
}
