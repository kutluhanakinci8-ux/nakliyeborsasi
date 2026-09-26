import {
  IsBoolean,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateMailCalendarEventRequestDto {
  @IsString()
  @MaxLength(200)
  public title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  public description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  public location?: string;

  @IsISO8601()
  public startsAt!: string;

  @IsISO8601()
  public endsAt!: string;

  @IsOptional()
  @IsBoolean()
  public allDay?: boolean;
}

export class UpdateMailCalendarEventRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  public title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  public description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  public location?: string | null;

  @IsOptional()
  @IsISO8601()
  public startsAt?: string;

  @IsOptional()
  @IsISO8601()
  public endsAt?: string;

  @IsOptional()
  @IsBoolean()
  public allDay?: boolean;
}

export class ImportMailCalendarIcsRequestDto {
  @IsString()
  @MaxLength(500_000)
  public ics!: string;
}

export class CreateMailOrgContactRequestDto {
  @IsString()
  @MaxLength(120)
  public displayName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  public email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  public phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  public notes?: string;
}

export class CreateMailCalendarIcsFeedRequestDto {
  @IsString()
  @MaxLength(120)
  public label!: string;

  @IsString()
  @MaxLength(2000)
  public feedUrl!: string;

  @IsOptional()
  @IsBoolean()
  public enabled?: boolean;
}

export class UpdateMailCalendarIcsFeedRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  public label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  public feedUrl?: string;

  @IsOptional()
  @IsBoolean()
  public enabled?: boolean;
}

export class CreateMailCalendarCalDavAccountRequestDto {
  @IsString()
  @MaxLength(120)
  public label!: string;

  @IsString()
  @MaxLength(2000)
  public calendarUrl!: string;

  @IsString()
  @MaxLength(320)
  public username!: string;

  @IsString()
  @MaxLength(500)
  public password!: string;

  @IsOptional()
  @IsBoolean()
  public enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  public writeEnabled?: boolean;
}

export class CreateMailContactCardDavAccountRequestDto {
  @IsString()
  @MaxLength(120)
  public label!: string;

  @IsString()
  @MaxLength(2000)
  public addressbookUrl!: string;

  @IsString()
  @MaxLength(320)
  public username!: string;

  @IsString()
  @MaxLength(500)
  public password!: string;

  @IsOptional()
  @IsBoolean()
  public enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  public writeEnabled?: boolean;
}

export class UpdateMailContactCardDavAccountRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  public label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  public addressbookUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  public username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  public password?: string;

  @IsOptional()
  @IsBoolean()
  public enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  public writeEnabled?: boolean;
}

export class UpdateMailCalendarCalDavAccountRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  public label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  public calendarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  public username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  public password?: string;

  @IsOptional()
  @IsBoolean()
  public enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  public writeEnabled?: boolean;
}

export class ImportMailContactsVcfRequestDto {
  @IsString()
  @MaxLength(500_000)
  public vcf!: string;
}

export class UpdateMailOrgContactRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  public displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  public email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  public phone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  public notes?: string | null;
}
