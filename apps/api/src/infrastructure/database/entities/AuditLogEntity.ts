import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "audit_logs" })
export class AuditLogEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid", nullable: true })
  public actorUserId!: string | null;

  @Column({ type: "uuid", nullable: true })
  public actorCompanyId!: string | null;

  @Column({ type: "varchar", length: 16 })
  public httpMethod!: string;

  @Column({ type: "varchar", length: 512 })
  public requestPath!: string;

  @Column({ type: "int" })
  public responseStatusCode!: number;

  @Column({ type: "varchar", length: 64 })
  public actionCode!: string;

  @Column({ type: "jsonb", nullable: true })
  public metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;
}
