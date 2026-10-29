import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

const TOPICS = ["technical", "billing", "sales", "general"] as const;

export class CreateMailSupportTicketDto {
  @IsIn(TOPICS)
  public topic!: (typeof TOPICS)[number];

  @IsString()
  @MaxLength(200)
  public subject!: string;

  @IsString()
  @MaxLength(8000)
  public message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(253)
  public domain?: string;
}

export class AddMailSupportTicketMessageDto {
  @IsString()
  @MaxLength(8000)
  public message!: string;
}

export class UpdateMailSupportTicketStatusDto {
  @IsIn(["open", "waiting_customer", "resolved"])
  public status!: "open" | "waiting_customer" | "resolved";
}

const OPERATOR_TOPICS = ["technical", "billing", "sales", "general"] as const;

export class ListOperatorSupportTicketsQueryDto {
  @IsOptional()
  @IsIn(OPERATOR_TOPICS)
  public topic?: (typeof OPERATOR_TOPICS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public company?: string;
}

export class MailSupportTicketIdParamDto {
  @IsUUID()
  public ticketId!: string;
}
