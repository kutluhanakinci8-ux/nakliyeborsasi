import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class MailPublicApiSendMessageDto {
  @IsEmail()
  public to!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  public subject!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500_000)
  public html?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500_000)
  public text?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  public idempotencyKey?: string;
}
