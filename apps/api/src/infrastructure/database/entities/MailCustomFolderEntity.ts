import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "mail_custom_folder" })
@Index(["organizationId", "name"], { unique: true })
export class MailCustomFolderEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public organizationId!: string;

  @Column({ type: "varchar", length: 64 })
  public name!: string;

  @Column({ type: "int", default: 0 })
  public sortOrder!: number;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;
}
