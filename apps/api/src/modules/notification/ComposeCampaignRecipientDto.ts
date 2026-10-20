import { IsEmail, IsOptional, IsString, MaxLength } from "class-validator";

export class ComposeCampaignRecipientDto {
  @IsEmail()
  @MaxLength(320)
  public email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public musteriAdi?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public referans?: string;
}
