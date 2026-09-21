export class AuditLogWriteRequest {
  public readonly actorUserId: string | null;

  public readonly actorCompanyId: string | null;

  public readonly httpMethod: string;

  public readonly requestPath: string;

  public readonly responseStatusCode: number;

  public readonly actionCode: string;

  public readonly metadata: Record<string, unknown> | null;

  public constructor(params: {
    actorUserId: string | null;
    actorCompanyId: string | null;
    httpMethod: string;
    requestPath: string;
    responseStatusCode: number;
    actionCode: string;
    metadata: Record<string, unknown> | null;
  }) {
    this.actorUserId = params.actorUserId;
    this.actorCompanyId = params.actorCompanyId;
    this.httpMethod = params.httpMethod;
    this.requestPath = params.requestPath;
    this.responseStatusCode = params.responseStatusCode;
    this.actionCode = params.actionCode;
    this.metadata = params.metadata;
  }
}
