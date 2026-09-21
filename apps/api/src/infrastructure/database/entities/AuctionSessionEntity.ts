import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { AuctionBidEntity } from "./AuctionBidEntity";

@Entity({ name: "auction_sessions" })
export class AuctionSessionEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public freightListingId!: string;

  @Column({ type: "uuid" })
  public ownerCompanyId!: string;

  @Column({ type: "varchar", length: 16 })
  public statusCode!: string;

  @Column({ type: "timestamptz" })
  public endsAt!: Date;

  @Column({ type: "numeric", precision: 14, scale: 2 })
  public minimumBidAmount!: string;

  @Column({ type: "varchar", length: 8 })
  public currencyCode!: string;

  @Column({ type: "uuid", nullable: true })
  public winningBidId!: string | null;

  @OneToMany(() => AuctionBidEntity, (bid) => bid.auctionSession)
  public bids!: AuctionBidEntity[];

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;
}
