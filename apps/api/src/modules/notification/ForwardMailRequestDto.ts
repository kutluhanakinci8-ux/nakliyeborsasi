import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
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

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  public delaySeconds?: number;
}
