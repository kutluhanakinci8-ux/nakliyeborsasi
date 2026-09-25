import { IsString, MaxLength } from "class-validator";

export class RegisterWebPushSubscriptionRequestDto {
  @IsString()
  @MaxLength(2048)
  public endpoint!: string;

  @IsString()
  @MaxLength(512)
  public p256dh!: string;

  @IsString()
  @MaxLength(512)
  public auth!: string;
}

export class UnregisterWebPushSubscriptionRequestDto {
  @IsString()
  @MaxLength(2048)
  public endpoint!: string;
}
