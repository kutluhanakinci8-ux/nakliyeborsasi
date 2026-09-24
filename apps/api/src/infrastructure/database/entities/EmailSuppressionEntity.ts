import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "email_suppressions" })
export class EmailSuppressionEntity {
  @PrimaryColumn({ type: "varchar", length: 320 })
  public emailAddress!: string;

  @Column({ type: "varchar", length: 32 })
  public reason!: string;

  @Column({ type: "varchar", length: 32 })
  public source!: string;

  @Column({ type: "text", nullable: true })
  public note!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
