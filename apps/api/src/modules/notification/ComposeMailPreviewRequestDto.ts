import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class ComposeMailPreviewRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200_000)
  public text!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500_000)
  public html?: string;
}
