import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { CompanyMembershipEntity } from "./CompanyMembershipEntity";

@Entity({ name: "user_accounts" })
export class UserAccountEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "varchar", length: 320, unique: true })
  public emailAddress!: string;

  @Column({ type: "varchar", length: 255 })
  public passwordHash!: string;

  @Column({ type: "varchar", length: 120 })
  public displayName!: string;

  @OneToMany(() => CompanyMembershipEntity, (membership) => membership.user)
  public memberships!: CompanyMembershipEntity[];

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
