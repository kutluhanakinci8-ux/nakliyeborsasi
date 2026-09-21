import { Module } from "@nestjs/common";
import { AuditLogPersistenceService } from "./AuditLogPersistenceService";
import { HttpRequestAuditLoggingInterceptor } from "./HttpRequestAuditLoggingInterceptor";

@Module({
  providers: [AuditLogPersistenceService, HttpRequestAuditLoggingInterceptor],
  exports: [AuditLogPersistenceService, HttpRequestAuditLoggingInterceptor],
})
export class AuditModule {}
