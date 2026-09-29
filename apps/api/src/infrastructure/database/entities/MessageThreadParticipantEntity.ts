import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

export type MessagingGroupParticipantRole =
  | "shipper"
  | "carrier"
  | "agent"
  | "observer";

@Entity({ name: "message_thread_participants" })
export class MessageThreadParticipantEntity {
  @PrimaryColumn({ name: "thread_id", type: "uuid" })
  public threadId!: string;

  @PrimaryColumn({ name: "company_id", type: "uuid" })
  public companyId!: string;

  @Column({
    name: "participant_role",
    type: "varchar",
    length: 16,
    default: "observer",
  })
  public participantRole!: MessagingGroupParticipantRole;

  @CreateDateColumn({ name: "joined_at", type: "timestamptz" })
  public joinedAt!: Date;
}
