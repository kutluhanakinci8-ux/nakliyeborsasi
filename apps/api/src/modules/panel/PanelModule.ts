import { Module } from "@nestjs/common";
import { PanelEntryController } from "./PanelEntryController";

@Module({
  controllers: [PanelEntryController],
})
export class PanelModule {}
