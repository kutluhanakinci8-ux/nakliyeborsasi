import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class SaveMailComposePresetRequestDto {
  @IsIn(["signature", "template"])
  public kind!: "signature" | "template";

  @IsString()
  @MaxLength(120)
  public name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  public subject?: string;

  @IsString()
  @MaxLength(20_000)
  public bodyText!: string;

  @IsOptional()
  @IsBoolean()
  public isDefault?: boolean;
}
