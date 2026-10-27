import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "message_voice_transcripts" })
export class MessageVoiceTranscriptEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public messageId!: string;

  @Column({ type: "int" })
  public attachmentIndex!: number;

  @Column({ type: "uuid" })
  public requestedByUserId!: string;

  @Column({ type: "uuid" })
  public requestedByCompanyId!: string;

  @Column({ type: "varchar", length: 16 })
  public status!: "pending" | "ready" | "failed";

  @Column({ type: "text", nullable: true })
  public textBody!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  public provider!: string | null;

  @Column({ type: "timestamptz" })
  public kvkkConsentAt!: Date;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
