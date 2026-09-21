import { Controller, Get } from "@nestjs/common";

@Controller("messaging")
export class MessagingModuleStatusController {
  @Get("status")
  public getStatus(): { module: string; phase: string } {
    return { module: "messaging", phase: "skeleton" };
  }
}
