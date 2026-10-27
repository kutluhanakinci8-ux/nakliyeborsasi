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

  @Column({ name: "language_code", type: "varchar", length: 8, nullable: true })
  public languageCode!: string | null;

  @Column({ name: "confidence_score", type: "double precision", nullable: true })
  public confidenceScore!: number | null;

  @Column({ name: "edited_text_body", type: "text", nullable: true })
  public editedTextBody!: string | null;

  @Column({ name: "edited_by_user_id", type: "uuid", nullable: true })
  public editedByUserId!: string | null;

  @Column({ name: "edited_at", type: "timestamptz", nullable: true })
  public editedAt!: Date | null;

  @Column({ name: "search_text", type: "text", nullable: true })
  public searchText!: string | null;

  @Column({ type: "timestamptz" })
  public kvkkConsentAt!: Date;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
