import {
  ArrayMinSize,
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

export class OpenMessagingGroupThreadRequestDto {
  @IsArray()
  @ArrayMinSize(2)
  @IsUUID("4", { each: true })
  public participantCompanyIds!: string[];

  @IsOptional()
  @IsUUID()
  public freightListingId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public title?: string;

  /** FS-12: firma kimliği → rol (yükleyici/nakliyeci/acente/gözlemci) */
  @IsOptional()
  @IsObject()
  public participantRoles?: Record<
    string,
    "shipper" | "carrier" | "agent" | "observer"
  >;
}
