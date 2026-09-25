import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "mail_address_alias" })
export class MailAddressAliasEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public organizationId!: string;

  @Column({ type: "uuid" })
  public mailDomainId!: string;

  @Column({ type: "varchar", length: 320, unique: true })
  public aliasEmail!: string;

  @Column({ type: "varchar", length: 64 })
  public localPart!: string;

  @Column({ type: "varchar", length: 120, nullable: true })
  public label!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
