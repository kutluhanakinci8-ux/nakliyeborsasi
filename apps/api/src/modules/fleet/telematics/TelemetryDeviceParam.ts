import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { FleetTelemetryDeviceEntity } from "../../../infrastructure/database/entities/FleetTelemetryDeviceEntity";

export const TelemetryDeviceParam = createParamDecorator(
  (_data: unknown, context: ExecutionContext): FleetTelemetryDeviceEntity => {
    const request = context.switchToHttp().getRequest<{
      telemetryDevice: FleetTelemetryDeviceEntity;
    }>();
    return request.telemetryDevice;
  },
);
