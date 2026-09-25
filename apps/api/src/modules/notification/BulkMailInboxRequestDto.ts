import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
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
