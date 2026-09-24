import { IsEmail, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class TestNotificationEmailDto {
  @IsString()
  @MaxLength(64)
  public eventCode!: string;

  @IsEmail()
  public recipientEmail!: string;

  /** Faz B: outbox From çözümü için pilot organizasyon UUID */
  @IsOptional()
  @IsUUID()
  public organizationId?: string;
}
