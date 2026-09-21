import { IsNumber, Min } from "class-validator";

export class PlaceAuctionBidRequestDto {
  @IsNumber()
  @Min(1)
  public bidAmount!: number;
}
