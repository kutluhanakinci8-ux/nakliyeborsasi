import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateThreadMessageRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  public bodyText?: string;
}
