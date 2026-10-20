import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { MAIL_EMAIL_SOCIAL_PLATFORMS } from "./MailEmailSocialLinks";

export class MailEmailSocialLinkItemDto {
  @IsIn([...MAIL_EMAIL_SOCIAL_PLATFORMS])
  public platform!: (typeof MAIL_EMAIL_SOCIAL_PLATFORMS)[number];

  @IsString()
  @MaxLength(512)
  public url!: string;
}

export class UpdateMailEmailSocialLinksRequestDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => MailEmailSocialLinkItemDto)
  public emailSocialLinks?: MailEmailSocialLinkItemDto[];

  /** true ise tüm sosyal bağlantılar silinir (emailSocialLinks boş olabilir). */
  @IsOptional()
  @IsBoolean()
  public clearSocialLinks?: boolean;
}
