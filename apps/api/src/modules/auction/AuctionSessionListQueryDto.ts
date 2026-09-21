import { IsIn, IsOptional, IsString } from "class-validator";

export class AuctionSessionListQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(["open", "closed", "all"])
  public status?: "open" | "closed" | "all";

  @IsOptional()
  @IsString()
  public lang?: string;
}
