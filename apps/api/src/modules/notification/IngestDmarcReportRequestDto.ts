import { Type } from "class-transformer";
import {
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

class DmarcDispositionDto {
  @IsInt()
  @Min(0)
  public none!: number;

  @IsInt()
  @Min(0)
  public quarantine!: number;

  @IsInt()
  @Min(0)
  public reject!: number;
}

class DmarcAuthDto {
  @IsInt()
  @Min(0)
  public pass!: number;

  @IsInt()
  @Min(0)
  public fail!: number;
}

export class IngestDmarcSummaryDto {
  @IsString()
  @MaxLength(255)
  public domain!: string;

  @IsISO8601()
  public periodStart!: string;

  @IsISO8601()
  public periodEnd!: string;

  @IsInt()
  @Min(0)
  public messageCount!: number;

  @ValidateNested()
  @Type(() => DmarcDispositionDto)
  public disposition!: DmarcDispositionDto;

  @ValidateNested()
  @Type(() => DmarcAuthDto)
  public dkim!: DmarcAuthDto;

  @ValidateNested()
  @Type(() => DmarcAuthDto)
  public spf!: DmarcAuthDto;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  public reporterOrgName?: string;
}

export class IngestDmarcReportRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(2_000_000)
  public xml?: string;

  @IsOptional()
  @IsUUID()
  public organizationId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => IngestDmarcSummaryDto)
  public summary?: IngestDmarcSummaryDto;
}
