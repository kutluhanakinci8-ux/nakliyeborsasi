import { IsISO8601, IsOptional } from "class-validator";

export class SnoozeMailMessageRequestDto {
  @IsOptional()
  @IsISO8601()
  public snoozedUntil?: string;
}
