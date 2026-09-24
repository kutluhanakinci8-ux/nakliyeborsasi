import { IsEmail } from "class-validator";

export class RequestPasswordResetDto {
  @IsEmail()
  public emailAddress!: string;
}
