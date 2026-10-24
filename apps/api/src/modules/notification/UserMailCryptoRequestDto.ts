import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateUserMailCryptoRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(120_000)
  public pgpPublicKeyArmored?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  public pgpKeyFingerprint?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32_000)
  public smimeCertificatePem?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32_000)
  public smimePrivateKeyPem?: string | null;

  @IsOptional()
  @IsBoolean()
  public clearSmimePrivateKey?: boolean;

  @IsOptional()
  @IsBoolean()
  public outboundSignSmime?: boolean;

  @IsOptional()
  @IsBoolean()
  public composePreferPgp?: boolean;
}
