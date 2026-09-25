import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from "class-validator";

export class CreateMailAliasRequestDto {
  @IsUUID()
  public mailDomainId!: string;

  @IsString()
  @Matches(/^[a-z0-9][a-z0-9._-]{0,62}$/i)
  public localPart!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID("4", { each: true })
  public mailboxIds!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public label?: string;
}
