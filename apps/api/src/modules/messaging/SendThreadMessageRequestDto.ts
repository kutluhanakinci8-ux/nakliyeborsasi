import { IsString, MaxLength, MinLength } from "class-validator";

export class SendThreadMessageRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  public bodyText!: string;
}
