import { Type } from "class-transformer";
import {
  IsArray,
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

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  public cc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  public bcc?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  public subject!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200_000)
  public text!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500_000)
  public html?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComposeMailAttachmentDto)
  public attachments?: ComposeMailAttachmentDto[];

  /** 1–10: gönderimi geciktir (geri al penceresi). 0 veya boş = anında gönder. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  public delaySeconds?: number;
}
