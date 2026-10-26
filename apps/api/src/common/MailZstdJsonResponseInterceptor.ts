import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, from, switchMap } from "rxjs";
import { Request } from "express";
import {
  maybeCompressJsonEnvelope,
  parseClientLertaEncoding,
} from "./mailZstdHttp.util";

/** Posta istemcisi X-Lerta-Encoding: zstd | br | gzip gönderdiğinde JSON yanıtları sıkıştırır. */
@Injectable()
export class MailZstdJsonResponseInterceptor implements NestInterceptor {
  public intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    if (!parseClientLertaEncoding(request)) {
      return next.handle();
    }
    return next.handle().pipe(
      switchMap((data) => from(maybeCompressJsonEnvelope(request, data))),
    );
  }
}
