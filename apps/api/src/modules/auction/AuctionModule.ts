import { Module } from "@nestjs/common";
import { AuctionModuleStatusController } from "./AuctionModuleStatusController";

@Module({
  controllers: [AuctionModuleStatusController],
})
export class AuctionModule {}
