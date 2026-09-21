import { Module } from "@nestjs/common";
import { TrustScoreModuleStatusController } from "./TrustScoreModuleStatusController";

@Module({
  controllers: [TrustScoreModuleStatusController],
})
export class TrustScoreModule {}
