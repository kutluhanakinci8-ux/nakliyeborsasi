import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";

export class MessagingAttachmentInputDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  public filename!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  public contentType!: string;

  @IsString()
  @MinLength(8)
  public contentBase64!: string;
}

export class SendThreadMessageRequestDto {
  @ValidateIf((body) => !body.attachments || body.attachments.length === 0)
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  public bodyText!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => MessagingAttachmentInputDto)
  public attachments?: MessagingAttachmentInputDto[];

  @IsOptional()
  @IsString()
  public messageKind?: "public" | "internal";
}
