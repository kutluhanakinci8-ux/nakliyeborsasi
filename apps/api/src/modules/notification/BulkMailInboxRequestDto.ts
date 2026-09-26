import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsString,
  MaxLength,
} from "class-validator";

export class BulkMailInboxIdsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  public messageIds!: string[];
}

export class BulkMailInboxFolderDto extends BulkMailInboxIdsDto {
  @IsIn(["inbox", "archive", "trash"])
  public folder!: "inbox" | "archive" | "trash";
}

export class BulkMailInboxStarDto extends BulkMailInboxIdsDto {
  @IsBoolean()
  public starred!: boolean;
}

export class BulkMailInboxSnoozeDto extends BulkMailInboxIdsDto {
  @IsISO8601()
  public snoozedUntil!: string;
}
