import { Type } from "class-transformer";
import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";

export class ComposeMailAttachmentDto {
  @IsString()
  @MaxLength(120)
  public filename!: string;

  @IsString()
  @MaxLength(120)
  public contentType!: string;

  @IsString()
  @MinLength(1)
  public contentBase64!: string;
}

export class ComposeMailRequestDto {
  @IsEmail()
  @MaxLength(320)
  public to!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  public subject!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200_000)
  public text!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComposeMailAttachmentDto)
  public attachments?: ComposeMailAttachmentDto[];
}
