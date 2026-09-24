import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { MailDomainEntity } from "./MailDomainEntity";

export type MailSenderPurpose = "transactional" | "marketing";

@Entity({ name: "mail_sender_identity" })
export class MailSenderIdentityEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public mailDomainId!: string;

  @Column({ type: "uuid" })
  public organizationId!: string;

  @Column({ type: "varchar", length: 64 })
  public localPart!: string;

  @Column({ type: "varchar", length: 120, nullable: true })
  public displayName!: string | null;

  @Column({ type: "varchar", length: 16, default: "transactional" })
  public purpose!: MailSenderPurpose;

  @Column({ type: "boolean", default: false })
  public isDefault!: boolean;

  @ManyToOne(() => MailDomainEntity, (domain) => domain.senderIdentities, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "mailDomainId" })
  public mailDomain!: MailDomainEntity;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
