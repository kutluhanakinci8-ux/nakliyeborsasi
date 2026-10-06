import { Module } from "@nestjs/common";
import { EkolojikMarketStatusController } from "./EkolojikMarketStatusController";

@Module({
  controllers: [EkolojikMarketStatusController],
})
export class EkolojikMarketModule {}
