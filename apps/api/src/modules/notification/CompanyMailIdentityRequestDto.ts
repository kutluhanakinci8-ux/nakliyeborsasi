import { IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class RegisterCustomDomainDto {
  @IsString()
  @MinLength(4)
  @MaxLength(255)
  @Matches(/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i, {
    message: "Geçerli bir alan adı girin",
  })
  public domain!: string;
}

export class SelectMailPlanRequestDto {
  @IsString()
  @MinLength(4)
  @MaxLength(64)
  public planCode!: string;
}

export class ProvisionMailIdentityDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Matches(/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/, {
    message: "local-part: küçük harf, rakam, tire",
  })
  public localPart!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public displayName?: string;

  /** İlk kutu varsayılan true; ek kutular için false gönderin. */
  @IsOptional()
  public makeDefault?: boolean;
}
