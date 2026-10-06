import { Controller, Get } from "@nestjs/common";

const EK_PHASE = "ek-u1";

const EK_FEATURES = [
  "ekolojik_product_shell",
  "ekolojik_communications_hub_unified",
  "ekolojik_mail_web_embed",
  "ekolojik_messaging_full_chat",
  "ekolojik_social_hub_embed",
  "ekolojik_ci_workflow_ek_0",
] as const;

const EK_PHASE_MILESTONES = [
  "ek-0",
  "ek-u1",
  "ek-p1",
  "ek-m1",
  "ek-s1",
  "ek-u4",
] as const;

@Controller("public/ekolojik-market")
export class EkolojikMarketStatusController {
  @Get("status")
  public getStatus(): {
    module: string;
    phase: string;
    features: string[];
    phaseMilestones: string[];
    parityRoadmapDoc: string;
    hubWebPath: string;
  } {
    return {
      module: "ekolojik_market",
      phase: EK_PHASE,
      features: [...EK_FEATURES],
      phaseMilestones: [...EK_PHASE_MILESTONES],
      parityRoadmapDoc: "docs/EKOLojIK_MARKET_PARITY_ROADMAP.md",
      hubWebPath: "/marketim/posta-ve-mesaj",
    };
  }
}
