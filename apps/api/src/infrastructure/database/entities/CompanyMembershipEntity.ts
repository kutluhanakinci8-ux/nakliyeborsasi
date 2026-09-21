import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { CompanyEntity } from "./CompanyEntity";
import { UserAccountEntity } from "./UserAccountEntity";

@Entity({ name: "company_memberships" })
@Unique(["companyId", "userId"])
export class CompanyMembershipEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public companyId!: string;

  @Column({ type: "uuid" })
  public userId!: string;

  @Column({ type: "varchar", length: 64 })
  public roleCode!: string;

  @ManyToOne(() => CompanyEntity, (company) => company.memberships, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "companyId" })
  public company!: CompanyEntity;

  @ManyToOne(() => UserAccountEntity, (user) => user.memberships, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "userId" })
  public user!: UserAccountEntity;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;
}
