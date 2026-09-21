import { Controller, Get, Redirect } from "@nestjs/common";

@Controller()
export class PanelEntryController {
  @Get("panel")
  @Redirect("/panel/index.html", 302)
  public redirectToPanel(): void {}

  @Get()
  @Redirect("/panel/index.html", 302)
  public redirectRootToPanel(): void {}
}
