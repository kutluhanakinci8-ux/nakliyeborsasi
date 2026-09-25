import { Type } from "class-transformer";
import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { ComposeMailAttachmentDto } from "./ComposeMailRequestDto";

export class SaveMailDraftRequestDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  public to?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  public subject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200_000)
  public text?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComposeMailAttachmentDto)
  public attachments?: ComposeMailAttachmentDto[];
}
