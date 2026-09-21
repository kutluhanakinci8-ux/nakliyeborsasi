import { IsNumber, IsString, IsUUID, Min } from "class-validator";

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
}
