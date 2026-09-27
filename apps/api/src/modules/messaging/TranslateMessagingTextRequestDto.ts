import { IsString, MaxLength, MinLength } from "class-validator";

export class TranslateMessagingTextRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  public text!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(8)
  public targetLocale!: string;
}
