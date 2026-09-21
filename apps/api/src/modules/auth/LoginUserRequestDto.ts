import { IsEmail, IsString, MinLength } from "class-validator";

export class LoginUserRequestDto {
  @IsEmail()
  public emailAddress!: string;

  @IsString()
  @MinLength(8)
  public password!: string;
}
