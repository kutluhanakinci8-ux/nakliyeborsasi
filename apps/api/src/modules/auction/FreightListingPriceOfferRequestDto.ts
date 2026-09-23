import { IsNumber, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class FreightListingPriceOfferRequestDto {
  @IsNumber()
  @Min(0.01)
  public offerAmount!: number;

  @IsString()
  @MaxLength(8)
  public currencyCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  public note?: string;
}
