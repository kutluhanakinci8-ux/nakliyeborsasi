import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "company_trust_reviews" })
export class CompanyTrustReviewEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public targetCompanyId!: string;

  @Column({ type: "uuid" })
  public authorCompanyId!: string;

  @Column({ type: "int" })
  public scoreValue!: number;

  @Column({ type: "varchar", length: 2000 })
  public commentText!: string;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;
}
