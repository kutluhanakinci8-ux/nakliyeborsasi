import { IsOptional, IsString, MaxLength } from "class-validator";

export class ConfirmTransportCompletionRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  public completionNote?: string;
}
