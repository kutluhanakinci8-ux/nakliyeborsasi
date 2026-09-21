import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { Request, Response } from "express";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import {
  AuditLogPersistenceService,
} from "./AuditLogPersistenceService";
import { AuditLogWriteRequest } from "./AuditLogWriteRequest";

@Injectable()
export class HttpRequestAuditLoggingInterceptor implements NestInterceptor {
  public constructor(
    private readonly auditLogPersistenceService: AuditLogPersistenceService,
  ) {}

  public intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request & { user?: AuthenticatedUserContext }>();
    const response = httpContext.getResponse<Response>();
    return next.handle().pipe(
      tap(async () => {
        const authenticatedUser = request.user;
        await this.auditLogPersistenceService.appendEntry(
          new AuditLogWriteRequest({
            actorUserId: authenticatedUser?.userId ?? null,
            actorCompanyId: authenticatedUser?.companyId ?? null,
            httpMethod: request.method,
            requestPath: request.path,
            responseStatusCode: response.statusCode,
            actionCode: "HTTP_REQUEST",
            metadata: {
              route: request.route?.path ?? request.url,
            },
          }),
        );
      }),
    );
  }
}
