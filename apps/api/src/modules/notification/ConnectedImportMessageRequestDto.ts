import { IsIn, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class ConnectedImportMessageRequestDto {
  @IsIn(["microsoft_graph", "gmail_api"])
  public provider!: "microsoft_graph" | "gmail_api";

  @IsUUID()
  public accountId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  public providerMessageId!: string;
}
