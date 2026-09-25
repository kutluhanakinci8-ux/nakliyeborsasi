import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from "class-validator";

export class CreateMailCustomFolderRequestDto {
  @IsString()
  @MaxLength(64)
  public name!: string;
}

export class UpdateMailCustomFolderRequestDto {
  @IsString()
  @MaxLength(64)
  public name!: string;
}

export class SetMessageCustomFolderRequestDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsUUID()
  public customFolderId!: string | null;
}

export class BulkSetMessageCustomFolderRequestDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  public messageIds!: string[];

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsUUID()
  public customFolderId!: string | null;
}
