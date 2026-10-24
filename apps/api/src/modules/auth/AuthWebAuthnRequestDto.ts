import { IsObject, IsOptional, IsString, MaxLength } from "class-validator";

export class WebAuthnRegistrationVerifyDto {
  @IsObject()
  public response!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public deviceName?: string;
}

export class WebAuthnAuthenticationVerifyDto {
  @IsObject()
  public response!: Record<string, unknown>;
}

export class WebAuthnRegisterOptionsDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  public deviceName?: string;
}
