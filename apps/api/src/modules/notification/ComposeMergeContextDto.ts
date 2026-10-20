import { IsOptional, IsString, MaxLength } from "class-validator";

export class ComposeMergeContextDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  public referans?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public musteriAdi?: string;
}
