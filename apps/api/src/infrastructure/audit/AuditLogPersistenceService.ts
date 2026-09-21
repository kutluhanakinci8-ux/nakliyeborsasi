import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditLogEntity } from "../database/entities/AuditLogEntity";
import { AuditLogWriteRequest } from "./AuditLogWriteRequest";

@Injectable()
export class AuditLogPersistenceService {
  public constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepository: Repository<AuditLogEntity>,
  ) {}

  public async appendEntry(request: AuditLogWriteRequest): Promise<void> {
    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        actorUserId: request.actorUserId,
        actorCompanyId: request.actorCompanyId,
        httpMethod: request.httpMethod,
        requestPath: request.requestPath,
        responseStatusCode: request.responseStatusCode,
        actionCode: request.actionCode,
        metadata: request.metadata,
      }),
    );
  }
}
