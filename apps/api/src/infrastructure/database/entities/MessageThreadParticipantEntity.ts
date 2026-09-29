import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "message_thread_participants" })
export class MessageThreadParticipantEntity {
  @PrimaryColumn({ name: "thread_id", type: "uuid" })
  public threadId!: string;

  @PrimaryColumn({ name: "company_id", type: "uuid" })
  public companyId!: string;

  @CreateDateColumn({ name: "joined_at", type: "timestamptz" })
  public joinedAt!: Date;
}
