import {
  IsBoolean,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class UpdateMailInboxPreferencesRequestDto {
  @IsOptional()
  @IsBoolean()
  public dailyDigestEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  public autoReplyEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  public autoReplyBodyText?: string | null;

  @IsOptional()
  @IsISO8601()
  public autoReplyActiveFrom?: string | null;

  @IsOptional()
  @IsISO8601()
  public autoReplyActiveUntil?: string | null;

  @IsOptional()
  @IsIn(["comfortable", "compact"])
  public inboxListDensity?: "comfortable" | "compact";
}
