import { ArrayMinSize, IsArray, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

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
}
