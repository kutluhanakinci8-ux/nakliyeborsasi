import { Controller, Get } from "@nestjs/common";

@Controller("trust-scores")
export class TrustScoreModuleStatusController {
  @Get("status")
  public getStatus(): { module: string; phase: string } {
    return { module: "trust-score", phase: "skeleton" };
  }
}
