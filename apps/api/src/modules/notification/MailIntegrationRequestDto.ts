import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import type { MailWebhookEventType } from "../../infrastructure/database/entities/MailOrganizationWebhookEndpointEntity";

const EVENTS: MailWebhookEventType[] = [
  "message.sent",
  "message.failed",
  "inbound.received",
];

export class CreateMailApiKeyRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  public label!: string;
}

export class CreateMailWebhookRequestDto {
  @IsString()
  @MinLength(8)
  @MaxLength(2048)
  public url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public description?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsIn(EVENTS, { each: true })
  public events!: MailWebhookEventType[];

  @IsOptional()
  @IsBoolean()
  public enabled?: boolean;
}

export class UpdateMailWebhookRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(2048)
  public url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public description?: string | null;

  @IsOptional()
  @IsArray()
  @IsIn(EVENTS, { each: true })
  public events?: MailWebhookEventType[];

  @IsOptional()
  @IsBoolean()
  public enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  public rotateSigningSecret?: boolean;
}
