import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  public getHealth(): { status: string } {
    return { status: "ok" };
  }
}
