import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class UpdatePlatformNotificationSettingDto {
  @IsString()
  @MaxLength(64)
  public eventCode!: string;

  @IsOptional()
  @IsBoolean()
  public adminEmailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  public userEmailEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  public adminRecipientEmails?: string[];
}
