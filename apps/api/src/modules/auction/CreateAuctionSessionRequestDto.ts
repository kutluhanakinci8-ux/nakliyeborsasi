import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";

export class CreateAuctionSessionRequestDto {
  @IsUUID()
  public freightListingId!: string;

  @IsNumber()
  @Min(1)
  public minimumBidAmount!: number;

  @IsString()
  public currencyCode!: string;

  @IsNumber()
  @Min(1)
  public durationHours!: number;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  public termsSummary?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(512)
  public specDocumentUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  public specDocumentLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  public paymentFormCode?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  public paymentDeferDays?: number;

  @IsOptional()
  @IsBoolean()
  public priceIncludesVat?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  public bidStepAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  public cargoDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  public auctionTypeCode?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  public autoExtendMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  public autoExtendWindowMinutes?: number;
}
