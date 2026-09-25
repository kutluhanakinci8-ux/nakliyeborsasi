import { IsString, Length, MinLength } from "class-validator";

export class ConfirmTotpSetupDto {
  @IsString()
  @Length(6, 8)
  public code!: string;
}

export class DisableTotpDto {
  @IsString()
  @MinLength(8)
  public password!: string;

  @IsString()
  @Length(6, 8)
  public code!: string;
}

export class CompleteTotpLoginDto {
  @IsString()
  @MinLength(16)
  public challengeToken!: string;

  @IsString()
  @Length(6, 8)
  public code!: string;
}
