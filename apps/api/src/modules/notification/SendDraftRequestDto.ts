import { IsInt, IsOptional, Max, Min } from "class-validator";

export class SendDraftRequestDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  public delaySeconds?: number;
}
