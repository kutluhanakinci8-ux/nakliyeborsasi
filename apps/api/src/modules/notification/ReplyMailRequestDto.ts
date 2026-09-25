import { Type } from "class-transformer";
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { ComposeMailAttachmentDto } from "./ComposeMailRequestDto";

export class ReplyMailRequestDto {
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
