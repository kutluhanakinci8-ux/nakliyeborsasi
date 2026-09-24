import { IsString, MinLength } from "class-validator";

export class VerifyEmailQueryDto {
  @IsString()
  @MinLength(32)
  public token!: string;
}
