import { IsString, MinLength } from "class-validator";

export class ResetPasswordDto {
  @IsString()
  @MinLength(32)
  public token!: string;

  @IsString()
  @MinLength(8)
  public newPassword!: string;
}
