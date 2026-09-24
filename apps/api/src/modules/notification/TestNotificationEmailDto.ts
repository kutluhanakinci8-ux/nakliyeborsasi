import { IsEmail, IsString, MaxLength } from "class-validator";

export class TestNotificationEmailDto {
  @IsString()
  @MaxLength(64)
  public eventCode!: string;

  @IsEmail()
  public recipientEmail!: string;
}
