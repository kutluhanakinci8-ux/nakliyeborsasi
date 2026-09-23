import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FleetTelemetryDeviceEntity } from "../../../infrastructure/database/entities/FleetTelemetryDeviceEntity";
import { TelemetryTokenHasher } from "./TelemetryTokenHasher";

@Injectable()
export class TelemetryDeviceGuard implements CanActivate {
  public constructor(
    @InjectRepository(FleetTelemetryDeviceEntity)
    private readonly deviceRepository: Repository<FleetTelemetryDeviceEntity>,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      body?: { deviceId?: string };
      telemetryDevice?: FleetTelemetryDeviceEntity;
    }>();
    const token = request.headers["x-nb-device-token"];
    const deviceId = request.body?.deviceId;
    if (!token || !deviceId) {
      throw new UnauthorizedException("Device token required");
    }
    const tokenHash = TelemetryTokenHasher.hashIngestToken(token);
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId, ingestTokenHash: tokenHash },
    });
    if (!device || device.consentRevokedAt || !device.trackingEnabled) {
      throw new UnauthorizedException("Invalid or inactive device");
    }
    request.telemetryDevice = device;
    return true;
  }
}
