import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "mail_webhook_delivery_log" })
@Index(["organizationId", "createdAt"])
export class MailWebhookDeliveryLogEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid", name: "organization_id" })
  public organizationId!: string;

  @Column({ type: "uuid", name: "webhook_endpoint_id" })
  public webhookEndpointId!: string;

  @Column({ type: "varchar", length: 64, name: "event_type" })
  public eventType!: string;

  @Column({ type: "uuid", name: "delivery_id" })
  public deliveryId!: string;

  @Column({ type: "smallint" })
  public attempt!: number;

  @Column({ type: "int", name: "http_status", nullable: true })
  public httpStatus!: number | null;

  @Column({ type: "boolean" })
  public success!: boolean;

  @Column({ type: "varchar", length: 500, name: "error_message", nullable: true })
  public errorMessage!: string | null;

  @Column({ type: "text", name: "payload_body", nullable: true })
  public payloadBody!: string | null;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  public createdAt!: Date;
}
