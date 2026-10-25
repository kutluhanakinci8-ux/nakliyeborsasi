import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";

export class UpdateMailboxAccessModeRequestDto {
  @IsIn(["organization", "delegates_only"])
  public accessMode!: "organization" | "delegates_only";

  @IsOptional()
  @IsUUID()
  public ownerUserId?: string | null;
}

export class AddMailboxDelegateRequestDto {
  @IsEmail()
  public email!: string;

  @IsIn(["read", "send", "manage"])
  public permission!: "read" | "send" | "manage";
}

export class CompleteExchangeOAuthRequestDto {
  @IsString()
  @IsNotEmpty()
  public code!: string;

  @IsString()
  @IsNotEmpty()
  public state!: string;
}
