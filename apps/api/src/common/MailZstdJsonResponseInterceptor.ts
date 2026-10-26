import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, from, switchMap } from "rxjs";
import { Request } from "express";
import {
  clientRequestedZstd,
  isZstdBase64Envelope,
  maybeZstdJsonEnvelope,
} from "./mailZstdHttp.util";

function shouldZstdWrap(data: unknown): boolean {
  if (data === null || data === undefined) {
    return false;
  }
  const t = typeof data;
  if (t !== "object") {
    return false;
  }
  if (Buffer.isBuffer(data)) {
    return false;
  }
  if (isZstdBase64Envelope(data)) {
    return false;
  }
  return true;
}

/** Posta istemcisi X-Lerta-Encoding: zstd gönderdiğinde JSON yanıtları sıkıştırır. */
@Injectable()
export class MailZstdJsonResponseInterceptor implements NestInterceptor {
  public intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    if (!clientRequestedZstd(request)) {
      return next.handle();
    }
    return next.handle().pipe(
      switchMap((data) => {
        if (!shouldZstdWrap(data)) {
          return from(Promise.resolve(data));
        }
        return from(maybeZstdJsonEnvelope(request, data));
      }),
    );
  }
}
