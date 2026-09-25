import { IsBoolean, IsOptional } from "class-validator";

export class UpdateMailInboxPreferencesRequestDto {
  @IsOptional()
  @IsBoolean()
  public dailyDigestEnabled?: boolean;
}
