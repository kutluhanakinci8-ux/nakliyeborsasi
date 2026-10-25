import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { ComposeMailAttachmentDto } from "./ComposeMailRequestDto";
import { ComposeMergeContextDto } from "./ComposeMergeContextDto";

export class ReplyMailRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200_000)
  public text!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  public cc?: string;

  @IsOptional()
  @IsBoolean()
  public replyAll?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  public bcc?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComposeMailAttachmentDto)
  public attachments?: ComposeMailAttachmentDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  public delaySeconds?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ComposeMergeContextDto)
  public merge?: ComposeMergeContextDto;

  @IsOptional()
  @IsIn(["microsoft_graph", "gmail_api"])
  public connectedSendProvider?: "microsoft_graph" | "gmail_api";

  @IsOptional()
  @IsUUID()
  public connectedSendAccountId?: string;

  @IsOptional()
  @IsDateString()
  public scheduleAt?: string;
}
