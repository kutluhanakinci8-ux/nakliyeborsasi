import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";
import { PlatformException } from "@nakliyeborsasi/core";

@Catch()
export class PlatformExceptionFilter implements ExceptionFilter {
  public catch(exception: unknown, host: ArgumentsHost): void {
    const httpContext = host.switchToHttp();
    const response = httpContext.getResponse<Response>();
    if (exception instanceof PlatformException) {
      response.status(exception.httpStatus).json({
        errorCode: exception.errorCode,
        message: exception.message,
      });
      return;
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      response.status(status).json(
        typeof payload === "string"
          ? { errorCode: "HTTP_ERROR", message: payload }
          : payload,
      );
      return;
    }
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      errorCode: "INTERNAL_ERROR",
      message: "Unexpected server error",
    });
  }
}
