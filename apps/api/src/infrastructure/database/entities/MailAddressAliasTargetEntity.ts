import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "mail_address_alias_target" })
export class MailAddressAliasTargetEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public aliasId!: string;

  @Column({ type: "uuid" })
  public mailboxId!: string;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;
}
