import { Module, Global } from "@nestjs/common";
import { MessageCatalogRepository } from "./MessageCatalogRepository";
import { LocaleResolutionService } from "./LocaleResolutionService";

@Global()
@Module({
  providers: [MessageCatalogRepository, LocaleResolutionService],
  exports: [LocaleResolutionService],
})
export class LocalizationModule {}
