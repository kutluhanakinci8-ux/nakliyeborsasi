import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from "class-validator";

export class CreateMailInboxRuleRequestDto {
  @IsString()
  @MaxLength(80)
  public name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  public fromContains?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  public subjectContains?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  public toContains?: string;

  @IsOptional()
  @IsBoolean()
  public requireAttachment?: boolean;

  @IsOptional()
  @IsBoolean()
  public actionStar?: boolean;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsUUID()
  public actionCustomFolderId?: string | null;

  @IsOptional()
  @IsBoolean()
  public actionArchive?: boolean;

  @IsOptional()
  @IsBoolean()
  public actionMarkRead?: boolean;

  @IsOptional()
  @IsBoolean()
  public actionTrash?: boolean;

  @IsOptional()
  @IsBoolean()
  public enabled?: boolean;
}

export class ReorderMailInboxRulesRequestDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsUUID("4", { each: true })
  public ruleIds!: string[];
}

export class UpdateMailInboxRuleRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  public name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  public fromContains?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  public subjectContains?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  public toContains?: string | null;

  @IsOptional()
  @IsBoolean()
  public requireAttachment?: boolean;

  @IsOptional()
  @IsBoolean()
  public actionStar?: boolean;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsUUID()
  public actionCustomFolderId?: string | null;

  @IsOptional()
  @IsBoolean()
  public actionArchive?: boolean;

  @IsOptional()
  @IsBoolean()
  public actionMarkRead?: boolean;

  @IsOptional()
  @IsBoolean()
  public actionTrash?: boolean;

  @IsOptional()
  @IsBoolean()
  public enabled?: boolean;
}
