import { Type } from "class-transformer";
import {
  IsArray,
  IsISO8601,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from "class-validator";

export class TelemetryIngestEventDto {
  @IsString()
  @MaxLength(48)
  public eventTypeCode!: string;

  @IsISO8601()
  public recordedAt!: string;

  @IsOptional()
  @IsNumber()
  public latitude?: number;

  @IsOptional()
  @IsNumber()
  public longitude?: number;

  @IsOptional()
  @IsNumber()
  public speedKmh?: number;

  @IsOptional()
  @IsNumber()
  public headingDegrees?: number;

  @IsOptional()
  @IsNumber()
  public horizontalAccuracyMeters?: number;

  @IsOptional()
  @IsNumber()
  public altitudeMeters?: number;

  @IsOptional()
  @IsNumber()
  public verticalAccuracyMeters?: number;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  public speedSourceCode?: string;

  @IsOptional()
  @IsObject()
  public payload?: Record<string, unknown>;
}

export class TelemetryIngestBatchRequestDto {
  @IsUUID()
  public deviceId!: string;

  @IsString()
  @MaxLength(64)
  public batchId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TelemetryIngestEventDto)
  public events!: TelemetryIngestEventDto[];
}
