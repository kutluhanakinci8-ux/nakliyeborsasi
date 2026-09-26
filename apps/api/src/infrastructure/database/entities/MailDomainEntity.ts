import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { MailSenderIdentityEntity } from "./MailSenderIdentityEntity";

export type MailDomainType =
  | "platform"
  | "custom"
  | "subdomain"
  | "instant_box";

export type MailDomainVerificationStatus =
  | "pending"
  | "verified"
  | "failed";

@Entity({ name: "mail_domains" })
export class MailDomainEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid", nullable: true })
  public organizationId!: string | null;

  @Column({ type: "varchar", length: 255 })
  public domain!: string;

  @Column({ type: "varchar", length: 16 })
  public domainType!: MailDomainType;

  @Column({ type: "varchar", length: 16, default: "pending" })
  public verificationStatus!: MailDomainVerificationStatus;

  @Column({ type: "jsonb", nullable: true })
  public dnsSnapshot!: Record<string, unknown> | null;

  @Column({ type: "text", nullable: true })
  public notes!: string | null;

  @OneToMany(() => MailSenderIdentityEntity, (row) => row.mailDomain)
  public senderIdentities!: MailSenderIdentityEntity[];

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
