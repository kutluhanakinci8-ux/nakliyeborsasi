import { Module } from "@nestjs/common";
import { RequestCompanyContextExtractor } from "./RequestCompanyContextExtractor";

@Module({
  providers: [RequestCompanyContextExtractor],
  exports: [RequestCompanyContextExtractor],
})
export class IdentityModule {}
