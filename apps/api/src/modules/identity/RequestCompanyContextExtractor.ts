import { Injectable } from "@nestjs/common";
import { Request } from "express";
import { ValidationException } from "@nakliyeborsasi/core";

@Injectable()
export class RequestCompanyContextExtractor {
  public extractCompanyId(request: Request): string {
    const headerValue = request.header("x-company-id");
    if (headerValue && headerValue.trim().length > 0) {
      return headerValue.trim();
    }
    return "demo-company-001";
  }

  public extractRequiredCompanyId(request: Request): string {
    const companyId = request.header("x-company-id");
    if (!companyId || companyId.trim().length === 0) {
      throw new ValidationException("x-company-id header is required");
    }
    return companyId.trim();
  }
}
