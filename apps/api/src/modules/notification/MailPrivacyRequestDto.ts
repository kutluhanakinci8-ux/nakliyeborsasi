import { IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class CreateMailDeletionRequestDto {
  @IsString()
  @MaxLength(64)
  public confirmPhrase!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  public reason?: string;
}

export class ConfirmMailDeletionRequestDto {
  @IsUUID()
  public requestId!: string;

  @IsString()
  @MaxLength(128)
  public confirmToken!: string;
}
