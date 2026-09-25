import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { ComposeMailAttachmentDto } from "./ComposeMailRequestDto";

export class ForwardMailRequestDto {
  @IsEmail()
  @MaxLength(320)
  public to!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200_000)
  public text?: string;

  @IsOptional()
  @IsBoolean()
  public includeOriginal?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComposeMailAttachmentDto)
  public attachments?: ComposeMailAttachmentDto[];
}
