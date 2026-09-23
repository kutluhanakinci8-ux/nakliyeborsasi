import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  ResourceNotFoundException,
  TELEMETRY_CONSENT_DOCUMENT_VERSION,
  TelemetryConsentPurposeCode,
  TelemetryEnrollResult,
  ValidationException,
} from "@nakliyeborsasi/core";
import { FleetDriverEntity } from "../../../infrastructure/database/entities/FleetDriverEntity";
import { FleetTelemetryConsentLogEntity } from "../../../infrastructure/database/entities/FleetTelemetryConsentLogEntity";
import { FleetTelemetryDeviceEntity } from "../../../infrastructure/database/entities/FleetTelemetryDeviceEntity";
import { FleetTelemetryEventEntity } from "../../../infrastructure/database/entities/FleetTelemetryEventEntity";
import { EnrollTelemetryDeviceRequestDto } from "./EnrollTelemetryDeviceRequestDto";
import { TelemetryIngestBatchRequestDto } from "./TelemetryIngestBatchRequestDto";
import { TelemetryMapper } from "./TelemetryMapper";
import { TelemetryMotionInterpreter } from "./TelemetryMotionInterpreter";
import { TelemetryTokenHasher } from "./TelemetryTokenHasher";

@Injectable()
export class TelemetryApplicationService {
  public constructor(
    @InjectRepository(FleetDriverEntity)
    private readonly driverRepository: Repository<FleetDriverEntity>,
    @InjectRepository(FleetTelemetryDeviceEntity)
    private readonly deviceRepository: Repository<FleetTelemetryDeviceEntity>,
    @InjectRepository(FleetTelemetryConsentLogEntity)
    private readonly consentLogRepository: Repository<FleetTelemetryConsentLogEntity>,
    @InjectRepository(FleetTelemetryEventEntity)
    private readonly eventRepository: Repository<FleetTelemetryEventEntity>,
  ) {}

  public async getDriverStatus(userId: string) {
    const driver = await this.findDriverForUser(userId);
    const device = await this.findPrimaryDevice(driver.id);
    const consentLog = await this.latestConsentLog(driver.id);
    const recentEvents = device
      ? await this.eventRepository.find({
          where: { deviceId: device.id },
          order: { recordedAt: "DESC" },
          take: 20,
        })
      : [];
    return TelemetryMapper.driverStatus({
      device,
      recentEvents,
      consentLog,
    });
  }

  public async grantConsent(userId: string, clientIp?: string) {
    const driver = await this.findDriverForUser(userId);
    const device = await this.findPrimaryDevice(driver.id);
    const now = new Date();
    if (device) {
      device.consentGrantedAt = now;
      device.consentRevokedAt = null;
      device.trackingEnabled = true;
      device.consentDocumentVersion = TELEMETRY_CONSENT_DOCUMENT_VERSION;
      await this.deviceRepository.save(device);
    }
    await this.appendConsentLog(driver.id, device?.id ?? null, "GRANT", clientIp);
    const consentLog = await this.latestConsentLog(driver.id);
    return TelemetryMapper.driverStatus({
      device,
      recentEvents: [],
      consentLog,
    });
  }

  public async revokeConsent(userId: string, clientIp?: string) {
    const driver = await this.findDriverForUser(userId);
    const device = await this.findPrimaryDevice(driver.id);
    if (!device) {
      throw new ValidationException("No telemetry device to revoke");
    }
    const now = new Date();
    device.consentRevokedAt = now;
    device.trackingEnabled = false;
    await this.deviceRepository.save(device);
    await this.appendConsentLog(driver.id, device.id, "REVOKE", clientIp);
    const consentLog = await this.latestConsentLog(driver.id);
    return TelemetryMapper.driverStatus({
      device,
      recentEvents: [],
      consentLog,
    });
  }

  public async enrollDevice(
    userId: string,
    payload: EnrollTelemetryDeviceRequestDto,
    clientIp?: string,
  ): Promise<TelemetryEnrollResult> {
    const driver = await this.findDriverForUser(userId);
    const existingDevices = await this.deviceRepository.find({
      where: { fleetDriverId: driver.id },
    });
    for (const row of existingDevices) {
      row.trackingEnabled = false;
      row.consentRevokedAt = new Date();
    }
    if (existingDevices.length > 0) {
      await this.deviceRepository.save(existingDevices);
    }

    const ingestToken = TelemetryTokenHasher.generateIngestToken();
    const now = new Date();
    const device = await this.deviceRepository.save(
      this.deviceRepository.create({
        companyId: driver.companyId,
        fleetDriverId: driver.id,
        platformCode: payload.platformCode,
        deviceLabel: payload.deviceLabel ?? null,
        ingestTokenHash: TelemetryTokenHasher.hashIngestToken(ingestToken),
        consentDocumentVersion: TELEMETRY_CONSENT_DOCUMENT_VERSION,
        consentGrantedAt: now,
        consentRevokedAt: null,
        trackingEnabled: true,
        lastSeenAt: null,
        lastLatitude: null,
        lastLongitude: null,
        lastSpeedKmh: null,
        activeTripCorrelationId: null,
      }),
    );
    await this.appendConsentLog(driver.id, device.id, "ENROLL", clientIp);
    return {
      deviceId: device.id,
      ingestToken,
      consent: TelemetryMapper.consentSnapshot(device, null),
    };
  }

  public async ingestBatch(
    device: FleetTelemetryDeviceEntity,
    payload: TelemetryIngestBatchRequestDto,
  ): Promise<{ acceptedCount: number }> {
    if (!payload.events.length) {
      return { acceptedCount: 0 };
    }
    const parsed = payload.events.map((event) => ({
      eventTypeCode: event.eventTypeCode,
      recordedAt: new Date(event.recordedAt),
      latitude: event.latitude,
      longitude: event.longitude,
      speedKmh: event.speedKmh,
      headingDegrees: event.headingDegrees,
      horizontalAccuracyMeters: event.horizontalAccuracyMeters,
      payload: event.payload,
    }));
    const derived = TelemetryMotionInterpreter.interpretBatch(device, parsed);
    const rows = derived.map((row) =>
      this.eventRepository.create({
        companyId: device.companyId,
        fleetDriverId: device.fleetDriverId,
        deviceId: device.id,
        eventTypeCode: row.eventTypeCode,
        recordedAt: row.recordedAt,
        latitude: row.latitude,
        longitude: row.longitude,
        speedKmh: row.speedKmh,
        headingDegrees: row.headingDegrees,
        horizontalAccuracyMeters: row.horizontalAccuracyMeters,
        severityCode: row.severityCode,
        tripCorrelationId: row.tripCorrelationId,
        payloadJson: row.payloadJson,
        ingestBatchId: payload.batchId,
      }),
    );
    await this.eventRepository.save(rows);

    const last = parsed[parsed.length - 1];
    device.lastSeenAt = new Date();
    if (last.latitude !== undefined) {
      device.lastLatitude = last.latitude;
    }
    if (last.longitude !== undefined) {
      device.lastLongitude = last.longitude;
    }
    if (last.speedKmh !== undefined) {
      device.lastSpeedKmh = last.speedKmh;
    }
    await this.deviceRepository.save(device);

    return { acceptedCount: rows.length };
  }

  private async findDriverForUser(userId: string): Promise<FleetDriverEntity> {
    const driver = await this.driverRepository.findOne({
      where: { linkedUserAccountId: userId },
    });
    if (!driver) {
      throw new ResourceNotFoundException("FleetDriver", userId);
    }
    return driver;
  }

  private async findPrimaryDevice(
    fleetDriverId: string,
  ): Promise<FleetTelemetryDeviceEntity | null> {
    const devices = await this.deviceRepository.find({
      where: { fleetDriverId },
      order: { createdAt: "DESC" },
      take: 1,
    });
    return devices[0] ?? null;
  }

  private async latestConsentLog(
    fleetDriverId: string,
  ): Promise<FleetTelemetryConsentLogEntity | null> {
    const rows = await this.consentLogRepository.find({
      where: { fleetDriverId },
      order: { createdAt: "DESC" },
      take: 1,
    });
    return rows[0] ?? null;
  }

  private async appendConsentLog(
    fleetDriverId: string,
    deviceId: string | null,
    actionCode: string,
    clientIp?: string,
  ): Promise<void> {
    await this.consentLogRepository.save(
      this.consentLogRepository.create({
        fleetDriverId,
        deviceId,
        actionCode,
        consentDocumentVersion: TELEMETRY_CONSENT_DOCUMENT_VERSION,
        purposesJson: [
          TelemetryConsentPurposeCode.FleetSafety,
          TelemetryConsentPurposeCode.DispatchEta,
          TelemetryConsentPurposeCode.RegulatoryEvidence,
        ],
        clientIpHash: TelemetryTokenHasher.hashClientIp(clientIp),
      }),
    );
  }
}
