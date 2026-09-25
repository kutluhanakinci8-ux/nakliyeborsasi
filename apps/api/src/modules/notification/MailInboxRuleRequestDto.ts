import {
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
  @IsBoolean()
  public actionStar?: boolean;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsUUID()
  public actionCustomFolderId?: string | null;

  @IsOptional()
  @IsBoolean()
  public enabled?: boolean;
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
  @IsBoolean()
  public actionStar?: boolean;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsUUID()
  public actionCustomFolderId?: string | null;

  @IsOptional()
  @IsBoolean()
  public enabled?: boolean;
}
