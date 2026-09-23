import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { FleetTelemetryDeviceEntity } from "../../../infrastructure/database/entities/FleetTelemetryDeviceEntity";
import { TelemetryApplicationService } from "./TelemetryApplicationService";
import { TelemetryDeviceGuard } from "./TelemetryDeviceGuard";
import { TelemetryDeviceParam } from "./TelemetryDeviceParam";
import { TelemetryIngestBatchRequestDto } from "./TelemetryIngestBatchRequestDto";

@Controller("fleet/telematics/ingest")
export class TelemetryIngestController {
  public constructor(
    private readonly telemetryApplicationService: TelemetryApplicationService,
  ) {}

  @Post("batch")
  @UseGuards(TelemetryDeviceGuard)
  public async ingestBatch(
    @TelemetryDeviceParam() device: FleetTelemetryDeviceEntity,
    @Body() body: TelemetryIngestBatchRequestDto,
  ) {
    const result = await this.telemetryApplicationService.ingestBatch(
      device,
      body,
    );
    return { message: "OK", ...result };
  }
}
