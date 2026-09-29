import { Injectable } from "@nestjs/common";
import { AuditLogPersistenceService } from "../../infrastructure/audit/AuditLogPersistenceService";
import { AuditLogWriteRequest } from "../../infrastructure/audit/AuditLogWriteRequest";
import type { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import type { MessagingClientRequestContext } from "./MessagingClientRequestContext";

export const MessagingAuditActionCode = {
  MessageCreate: "MESSAGING_MSG_CREATE",
  MessageUpdate: "MESSAGING_MSG_UPDATE",
  MessageDelete: "MESSAGING_MSG_DELETE",
  MessageStamp: "MESSAGING_MSG_STAMP",
} as const;

@Injectable()
export class MessagingAuditService {
  public constructor(
    private readonly auditLogPersistenceService: AuditLogPersistenceService,
  ) {}

  public async recordMessageMutation(
    actionCode: string,
    authenticatedUser: AuthenticatedUserContext,
    request: MessagingClientRequestContext,
    params: {
      threadId: string;
      messageId: string;
      httpMethod: string;
      requestPath: string;
      extra?: Record<string, unknown>;
    },
  ): Promise<void> {
    void this.auditLogPersistenceService.appendEntry(
      new AuditLogWriteRequest({
        actorUserId: authenticatedUser.userId,
        actorCompanyId: authenticatedUser.companyId,
        httpMethod: params.httpMethod,
        requestPath: params.requestPath,
        responseStatusCode: 200,
        actionCode,
        metadata: {
          threadId: params.threadId,
          messageId: params.messageId,
          clientIp: request.clientIp,
          userAgent: request.userAgent,
          ...params.extra,
        },
      }),
    );
  }
}
