import { IsString, MinLength } from "class-validator";

export class RegisterMessagingPushSubscriptionRequestDto {
  @IsString()
  @MinLength(8)
  public endpoint!: string;

  @IsString()
  @MinLength(8)
  public p256dh!: string;

  @IsString()
  @MinLength(8)
  public auth!: string;
}

export class UnregisterMessagingPushSubscriptionRequestDto {
  @IsString()
  @MinLength(8)
  public endpoint!: string;
}
