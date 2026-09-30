import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "company_social_thread_links" })
@Index("uq_social_thread_external", ["companyId", "platformCode", "externalThreadId"], {
  unique: true,
})
@Index("uq_social_thread_message_thread", ["messageThreadId"], { unique: true })
export class CompanySocialThreadLinkEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public companyId!: string;

  @Column({ type: "varchar", length: 48 })
  public platformCode!: string;

  @Column({ type: "varchar", length: 128 })
  public externalThreadId!: string;

  @Column({ type: "uuid" })
  public messageThreadId!: string;

  /** Sanal müşteri — message_threads.companyBId ile aynı */
  @Column({ type: "uuid" })
  public virtualCounterpartyId!: string;

  @Column({ type: "varchar", length: 240 })
  public displayLabel!: string;

  @Column({ type: "boolean", default: true })
  public isOpen!: boolean;

  @Column({ type: "timestamptz", nullable: true })
  public lastInboundAt!: Date | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  public lastExternalMessageId!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
