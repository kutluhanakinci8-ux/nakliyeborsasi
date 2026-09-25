import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class UpdateMailComposePresetRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  public name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  public subject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  public bodyText?: string;

  @IsOptional()
  @IsBoolean()
  public isDefault?: boolean;
}
