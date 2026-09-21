import { IsOptional, IsUUID } from "class-validator";

export class OpenMessagingThreadRequestDto {
  @IsUUID()
  public counterpartyCompanyId!: string;

  @IsOptional()
  @IsUUID()
  public freightListingId?: string;
}
