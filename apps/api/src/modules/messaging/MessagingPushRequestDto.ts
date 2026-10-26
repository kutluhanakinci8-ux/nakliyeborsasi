import { IsIn, IsString, Matches, MinLength } from "class-validator";

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

export class RegisterMessagingExpoPushTokenRequestDto {
  @IsString()
  @Matches(/^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/)
  public expoPushToken!: string;

  @IsIn(["ios", "android"])
  public platform!: "ios" | "android";
}

export class UnregisterMessagingExpoPushTokenRequestDto {
  @IsString()
  @Matches(/^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/)
  public expoPushToken!: string;
}
