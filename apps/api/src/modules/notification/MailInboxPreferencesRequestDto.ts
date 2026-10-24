import {
  IsBoolean,
  IsIn,
  IsInt,
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

  @IsOptional()
  @IsInt()
  @IsIn([0, 5, 10, 20, 30])
  public undoSendSeconds?: number;

  @IsOptional()
  @IsIn(["reply", "reply_all"])
  public defaultReplyMode?: "reply" | "reply_all";

  @IsOptional()
  @IsIn(["show", "ask", "hide"])
  public remoteImagesPolicy?: "show" | "ask" | "hide";

  @IsOptional()
  @IsIn(["list", "next", "previous"])
  public afterMessageAction?: "list" | "next" | "previous";

  @IsOptional()
  @IsBoolean()
  public confirmPermanentDelete?: boolean;

  @IsOptional()
  @IsBoolean()
  public confirmBulkDelete?: boolean;

  @IsOptional()
  @IsBoolean()
  public threadViewEnabled?: boolean;

  @IsOptional()
  @IsIn(["archive", "delete", "read"])
  public swipePrimaryAction?: "archive" | "delete" | "read";

  @IsOptional()
  @IsBoolean()
  public focusedInboxEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  public inboxSmartSortEnabled?: boolean;

  @IsOptional()
  @IsIn(["full", "trimmed", "none"])
  public replyQuoteMode?: "full" | "trimmed" | "none";
}
