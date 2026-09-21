import { Controller, Get } from "@nestjs/common";

@Controller("auctions")
export class AuctionModuleStatusController {
  @Get("status")
  public getStatus(): { module: string; phase: string } {
    return { module: "auction", phase: "skeleton" };
  }
}
