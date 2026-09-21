import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { AuctionSessionEntity } from "./AuctionSessionEntity";

@Entity({ name: "auction_bids" })
export class AuctionBidEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public auctionSessionId!: string;

  @Column({ type: "uuid" })
  public bidderCompanyId!: string;

  @Column({ type: "numeric", precision: 14, scale: 2 })
  public bidAmount!: string;

  @ManyToOne(() => AuctionSessionEntity, (session) => session.bids, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "auctionSessionId" })
  public auctionSession!: AuctionSessionEntity;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;
}
