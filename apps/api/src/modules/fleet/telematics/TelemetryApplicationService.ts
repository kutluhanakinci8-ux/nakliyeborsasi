import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, MoreThan, Repository } from "typeorm";
import {
  CompanyParticipantTypeCode,
  FleetDriverRouteSnapshot,
  FleetLiveDriverPin,
  FleetLiveMapSnapshot,
  FleetLiveTrackingState,
  FleetMotionPhase,
  ResourceNotFoundException,
  SubscriptionModuleCode,
  TELEMETRY_CONSENT_DOCUMENT_VERSION,
  TelemetryConsentPurposeCode,
  TelemetryEnrollResult,
  TelemetryEventTypeCode,
  TelemetryGpsFilter,
  TelemetryRoadGeometryStatusCode,
  ValidationException,
  LogisticsPoiKindCode,
} from "@nakliyeborsasi/core";
import { CompanyEntity } from "../../../infrastructure/database/entities/CompanyEntity";
import { FleetDriverEntity } from "../../../infrastructure/database/entities/FleetDriverEntity";
import { FleetVehicleEntity } from "../../../infrastructure/database/entities/FleetVehicleEntity";
import { ModularSubscriptionEntitlementService } from "../../subscription/ModularSubscriptionEntitlementService";
import { LocaleResolutionService } from "../../localization/LocaleResolutionService";
import { FleetTelemetryConsentLogEntity } from "../../../infrastructure/database/entities/FleetTelemetryConsentLogEntity";
import { FleetTelemetryDeviceEntity } from "../../../infrastructure/database/entities/FleetTelemetryDeviceEntity";
import { FleetTelemetryEventEntity } from "../../../infrastructure/database/entities/FleetTelemetryEventEntity";
import { EnrollTelemetryDeviceRequestDto } from "./EnrollTelemetryDeviceRequestDto";
import { TelemetryIngestBatchRequestDto } from "./TelemetryIngestBatchRequestDto";
import { TelemetryMapper } from "./TelemetryMapper";
import { TelemetryMotionInterpreter } from "./TelemetryMotionInterpreter";
import { TelemetryTokenHasher } from "./TelemetryTokenHasher";
import { TelemetryMotionAnalytics } from "./TelemetryMotionAnalytics";
import { LiveSnapCacheService } from "./routing/LiveSnapCacheService";
import { RouteReconstructionService } from "./routing/RouteReconstructionService";
import { TelemetryMatchingQueueService } from "./routing/TelemetryMatchingQueueService";
import { OsrmRoutingClient } from "./routing/OsrmRoutingClient";
import { RoutePoiAlongCorridorService } from "./poi/RoutePoiAlongCorridorService";

@Injectable()
export class TelemetryApplicationService {
  private static readonly LIVE_THRESHOLD_MS = 5 * 60 * 1000;
  private static readonly STALE_THRESHOLD_MS = 60 * 60 * 1000;

  public constructor(
    @InjectRepository(FleetDriverEntity)
    private readonly driverRepository: Repository<FleetDriverEntity>,
    @InjectRepository(FleetVehicleEntity)
    private readonly vehicleRepository: Repository<FleetVehicleEntity>,
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,
    @InjectRepository(FleetTelemetryDeviceEntity)
    private readonly deviceRepository: Repository<FleetTelemetryDeviceEntity>,
    @InjectRepository(FleetTelemetryConsentLogEntity)
    private readonly consentLogRepository: Repository<FleetTelemetryConsentLogEntity>,
    @InjectRepository(FleetTelemetryEventEntity)
    private readonly eventRepository: Repository<FleetTelemetryEventEntity>,
    private readonly modularSubscriptionEntitlementService: ModularSubscriptionEntitlementService,
    private readonly localeResolutionService: LocaleResolutionService,
    private readonly liveSnapCacheService: LiveSnapCacheService,
    private readonly routeReconstructionService: RouteReconstructionService,
    private readonly telemetryMatchingQueueService: TelemetryMatchingQueueService,
    private readonly osrmRoutingClient: OsrmRoutingClient,
    private readonly routePoiAlongCorridorService: RoutePoiAlongCorridorService,
  ) {}

  public async getCarrierLiveMap(
    companyId: string,
    locale: string,
  ): Promise<FleetLiveMapSnapshot> {
    await this.assertFleetTenant(companyId, locale);
    const drivers = await this.driverRepository.find({
      where: { companyId },
      order: { displayName: "ASC" },
    });
    const vehicles = await this.vehicleRepository.find({ where: { companyId } });
    const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
    const devices = await this.deviceRepository.find({
      where: { companyId, trackingEnabled: true },
      order: { lastSeenAt: "DESC", createdAt: "DESC" },
    });
    const recentPositionEvents = await this.eventRepository.find({
      where: { companyId },
      order: { recordedAt: "DESC" },
      take: 300,
    });
    const lastEventByDriver = new Map<string, FleetTelemetryEventEntity>();
    const recentSamplesByDriver = new Map<string, FleetTelemetryEventEntity[]>();
    for (const event of recentPositionEvents) {
      if (event.latitude === null || event.longitude === null) {
        continue;
      }
      if (!lastEventByDriver.has(event.fleetDriverId)) {
        lastEventByDriver.set(event.fleetDriverId, event);
      }
      if (event.eventTypeCode === TelemetryEventTypeCode.LocationSample) {
        const bucket = recentSamplesByDriver.get(event.fleetDriverId) ?? [];
        if (bucket.length < 4) {
          bucket.push(event);
          recentSamplesByDriver.set(event.fleetDriverId, bucket);
        }
      }
    }
    const deviceByDriver = new Map<string, FleetTelemetryDeviceEntity>();
    for (const device of devices) {
      if (device.consentRevokedAt) {
        continue;
      }
      if (!deviceByDriver.has(device.fleetDriverId)) {
        deviceByDriver.set(device.fleetDriverId, device);
      }
    }

    const now = Date.now();
    const pinDrafts = drivers.map((driver) => {
      const device = deviceByDriver.get(driver.id);
      const fallbackEvent = lastEventByDriver.get(driver.id);
      const vehicle = driver.activeVehicleId
        ? vehicleById.get(driver.activeVehicleId)
        : null;
      const latitude =
        device?.lastLatitude ?? fallbackEvent?.latitude ?? null;
      const longitude =
        device?.lastLongitude ?? fallbackEvent?.longitude ?? null;
      const lastSeenAt =
        device?.lastSeenAt ?? fallbackEvent?.recordedAt ?? null;
      const trackingState = this.resolveTrackingState(
        device,
        now,
        latitude,
        longitude,
        lastSeenAt,
      );
      const motion = this.motionFromSampleEvents(
        recentSamplesByDriver.get(driver.id) ?? [],
      );
      const latestSample = recentSamplesByDriver.get(driver.id)?.[0];
      const kinematics = this.readKinematicsPayload(latestSample?.payloadJson);
      return {
        driverId: driver.id,
        displayName: driver.displayName,
        primaryPhoneE164: driver.primaryPhoneE164,
        licensePlateDisplay: vehicle?.licensePlateDisplay ?? null,
        latitude,
        longitude,
        snappedLatitude: null as number | null,
        snappedLongitude: null as number | null,
        lastSpeedKmh:
          device?.lastSpeedKmh ?? fallbackEvent?.speedKmh ?? null,
        lastHeadingDegrees: latestSample?.headingDegrees ?? null,
        lastAltitudeMeters: kinematics.altitudeMeters,
        lastVerticalAccuracyMeters: kinematics.verticalAccuracyMeters,
        lastSpeedSourceCode: kinematics.speedSourceCode,
        lastSeenAt: lastSeenAt?.toISOString() ?? null,
        trackingState,
        motionPhase: motion.motionPhase,
        speedDeltaKmh: motion.speedDeltaKmh,
      };
    });

    const pins = await Promise.all(
      pinDrafts.map(async (pin) => {
        if (
          pin.latitude === null ||
          pin.longitude === null ||
          pin.trackingState !== "LIVE"
        ) {
          return pin;
        }
        const snapped = await this.liveSnapCacheService.snapDriver(
          pin.driverId,
          pin.longitude,
          pin.latitude,
        );
        if (!snapped) {
          return pin;
        }
        return {
          ...pin,
          snappedLatitude: snapped.latitude,
          snappedLongitude: snapped.longitude,
        };
      }),
    );

    return {
      updatedAt: new Date().toISOString(),
      drivers: pins,
    };
  }

  public async getCarrierDriverRoute(
    companyId: string,
    driverId: string,
    locale: string,
    hours: number,
    mode: "road" | "matched" = "road",
    poiKinds: readonly LogisticsPoiKindCode[] = [
      LogisticsPoiKindCode.WeighStation,
      LogisticsPoiKindCode.TruckParking,
    ],
  ): Promise<FleetDriverRouteSnapshot> {
    await this.assertFleetTenant(companyId, locale);
    const driver = await this.driverRepository.findOne({
      where: { id: driverId, companyId },
    });
    if (!driver) {
      throw new ResourceNotFoundException("FleetDriver", driverId);
    }
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const events = await this.eventRepository.find({
      where: {
        companyId,
        fleetDriverId: driverId,
        recordedAt: MoreThan(since),
        eventTypeCode: In([
          TelemetryEventTypeCode.LocationSample,
          TelemetryEventTypeCode.HarshBrake,
          TelemetryEventTypeCode.HarshAcceleration,
          TelemetryEventTypeCode.SpeedExceeded,
          TelemetryEventTypeCode.StopDetected,
          TelemetryEventTypeCode.SharpTurn,
          TelemetryEventTypeCode.CollisionSuspected,
          TelemetryEventTypeCode.IdleStart,
          TelemetryEventTypeCode.EngineIdleSuspected,
          TelemetryEventTypeCode.PhoneDistractionSuspected,
        ]),
      },
      order: { recordedAt: "ASC" },
      take: 800,
    });
    const rawRoutePoints = events
      .filter(
        (event) =>
          event.eventTypeCode === TelemetryEventTypeCode.LocationSample &&
          event.latitude !== null &&
          event.longitude !== null,
      )
      .map((event) => ({
        recordedAt: event.recordedAt.toISOString(),
        latitude: event.latitude as number,
        longitude: event.longitude as number,
        speedKmh: event.speedKmh,
        headingDegrees: event.headingDegrees,
        horizontalAccuracyMeters: event.horizontalAccuracyMeters,
        altitudeMeters: this.readNumberFromPayload(
          event.payloadJson,
          "altitudeMeters",
        ),
        verticalAccuracyMeters: this.readNumberFromPayload(
          event.payloadJson,
          "verticalAccuracyMeters",
        ),
      }));
    const filteredSamples = TelemetryGpsFilter.filterForRoute(rawRoutePoints);
    const routePoints = filteredSamples.map((point, index) => {
      const recordedAt =
        point.recordedAt instanceof Date
          ? point.recordedAt.toISOString()
          : point.recordedAt;
      const rawIndex = rawRoutePoints.findIndex(
        (raw) => raw.recordedAt === recordedAt,
      );
      const headingDegrees =
        rawIndex >= 0 ? rawRoutePoints[rawIndex].headingDegrees ?? null : null;
      return {
        recordedAt,
        latitude: point.latitude,
        longitude: point.longitude,
        speedKmh: point.speedKmh ?? null,
        headingDegrees,
      };
    });
    const safetyEvents = events.filter(
      (event) =>
        event.eventTypeCode !== TelemetryEventTypeCode.LocationSample &&
        event.latitude !== null &&
        event.longitude !== null,
    );
    const safetyMarkers = await Promise.all(
      safetyEvents.slice(0, 40).map(async (event) => {
        const latitude = event.latitude as number;
        const longitude = event.longitude as number;
        const snapped = await this.osrmRoutingClient.nearest(
          longitude,
          latitude,
        );
        const speedLimitKmh =
          event.eventTypeCode === TelemetryEventTypeCode.SpeedExceeded
            ? this.readSpeedLimitFromPayload(event.payloadJson)
            : null;
        return {
          eventTypeCode: event.eventTypeCode,
          recordedAt: event.recordedAt.toISOString(),
          latitude,
          longitude,
          severityCode: event.severityCode,
          roadLatitude: snapped?.latitude ?? null,
          roadLongitude: snapped?.longitude ?? null,
          speedLimitKmh,
        };
      }),
    );
    const windowEnd = new Date();
    const reconstructed = await this.routeReconstructionService.resolveRouteGeometry(
      {
        companyId,
        fleetDriverId: driverId,
        tripCorrelationId: null,
        windowStart: since,
        windowEnd,
        routePoints,
        preferMatched: mode === "matched",
      },
    );
    if (
      mode === "matched" &&
      reconstructed.roadGeometryStatus ===
        TelemetryRoadGeometryStatusCode.FallbackRaw
    ) {
      await this.routeReconstructionService.enqueueRebuildJob({
        companyId,
        fleetDriverId: driverId,
        tripCorrelationId: null,
        windowStartIso: since.toISOString(),
        windowEndIso: windowEnd.toISOString(),
        reason: "MANUAL",
      });
    }
    const routePois = await this.routePoiAlongCorridorService.resolveAlongRoute({
      roadGeometry: reconstructed.roadGeometry,
      kinds: poiKinds,
    });
    const motion = this.motionFromSampleEvents(
      events
        .filter(
          (event) => event.eventTypeCode === TelemetryEventTypeCode.LocationSample,
        )
        .slice(-4)
        .reverse(),
    );
    return {
      driverId: driver.id,
      displayName: driver.displayName,
      motionPhase: motion.motionPhase,
      speedDeltaKmh: motion.speedDeltaKmh,
      routePoints,
      safetyMarkers,
      roadGeometry: reconstructed.roadGeometry,
      roadGeometryStatus: reconstructed.roadGeometryStatus,
      matchedRouteId: reconstructed.matchedRouteId,
      distanceKm: reconstructed.distanceKm,
      speedSegments: reconstructed.speedSegments,
      routePois,
      updatedAt: new Date().toISOString(),
    };
  }

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
        interpreterStateJson: null,
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
      altitudeMeters: event.altitudeMeters,
      verticalAccuracyMeters: event.verticalAccuracyMeters,
      speedSourceCode: event.speedSourceCode,
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

    const lastLocation = [...parsed]
      .reverse()
      .find(
        (event) =>
          event.latitude !== undefined && event.longitude !== undefined,
      );
    device.lastSeenAt = new Date();
    if (lastLocation) {
      device.lastLatitude = lastLocation.latitude ?? device.lastLatitude;
      device.lastLongitude = lastLocation.longitude ?? device.lastLongitude;
      if (lastLocation.speedKmh !== undefined) {
        device.lastSpeedKmh = lastLocation.speedKmh;
      }
    }
    await this.deviceRepository.save(device);

    const locationSampleCount = parsed.filter(
      (event) =>
        event.latitude !== undefined && event.longitude !== undefined,
    ).length;
    if (
      this.telemetryMatchingQueueService.shouldEnqueueAfterIngest(
        locationSampleCount,
      )
    ) {
      const windowEnd = new Date();
      const windowStart = new Date(Date.now() - 6 * 60 * 60 * 1000);
      await this.telemetryMatchingQueueService.enqueue({
        companyId: device.companyId,
        fleetDriverId: device.fleetDriverId,
        tripCorrelationId: device.activeTripCorrelationId,
        windowStartIso: windowStart.toISOString(),
        windowEndIso: windowEnd.toISOString(),
        reason: "INGEST_BATCH",
      });
    }

    return { acceptedCount: rows.length };
  }

  private readKinematicsPayload(payload: Record<string, unknown> | null | undefined): {
    altitudeMeters: number | null;
    verticalAccuracyMeters: number | null;
    speedSourceCode: string | null;
  } {
    return {
      altitudeMeters: this.readNumberFromPayload(payload ?? null, "altitudeMeters"),
      verticalAccuracyMeters: this.readNumberFromPayload(
        payload ?? null,
        "verticalAccuracyMeters",
      ),
      speedSourceCode:
        typeof payload?.speedSourceCode === "string"
          ? payload.speedSourceCode
          : null,
    };
  }

  private readNumberFromPayload(
    payload: Record<string, unknown> | null,
    key: string,
  ): number | null {
    if (!payload) {
      return null;
    }
    const raw = payload[key];
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return raw;
    }
    return null;
  }

  private readSpeedLimitFromPayload(
    payload: Record<string, unknown> | null,
  ): number | null {
    if (!payload) {
      return null;
    }
    const raw = payload.speedLimitKmh ?? payload.maxSpeedKmh;
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return raw;
    }
    return null;
  }

  private motionFromSampleEvents(
    eventsNewestFirst: readonly FleetTelemetryEventEntity[],
  ): { motionPhase: FleetMotionPhase; speedDeltaKmh: number | null } {
    const chronological = [...eventsNewestFirst].reverse();
    const samples = chronological.map((event) => ({
      recordedAt: event.recordedAt,
      speedKmh: event.speedKmh,
    }));
    const motionPhase = TelemetryMotionAnalytics.deriveMotionPhase(samples);
    let speedDeltaKmh: number | null = null;
    if (samples.length >= 2) {
      const latest = samples[samples.length - 1].speedKmh ?? 0;
      const previous = samples[samples.length - 2].speedKmh ?? latest;
      speedDeltaKmh = Math.round((latest - previous) * 10) / 10;
    }
    return { motionPhase, speedDeltaKmh };
  }

  private resolveTrackingState(
    device: FleetTelemetryDeviceEntity | undefined,
    nowMs: number,
    latitude: number | null = device?.lastLatitude ?? null,
    longitude: number | null = device?.lastLongitude ?? null,
    lastSeenAt: Date | null = device?.lastSeenAt ?? null,
  ): FleetLiveTrackingState {
    if (latitude === null || longitude === null) {
      return "NO_SIGNAL";
    }
    const seenAt = lastSeenAt?.getTime() ?? 0;
    const age = nowMs - seenAt;
    if (age <= TelemetryApplicationService.LIVE_THRESHOLD_MS) {
      return "LIVE";
    }
    if (age <= TelemetryApplicationService.STALE_THRESHOLD_MS) {
      return "STALE";
    }
    return "OFFLINE";
  }

  private async assertFleetTenant(companyId: string, locale: string): Promise<void> {
    await this.modularSubscriptionEntitlementService.assertModuleAccess(
      companyId,
      SubscriptionModuleCode.Fleet,
      locale,
    );
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) {
      throw new ResourceNotFoundException("Company", companyId);
    }
    const participant = company.participantTypeCode;
    const allowed =
      participant === CompanyParticipantTypeCode.LoadCarrier ||
      participant === CompanyParticipantTypeCode.LoadSeeker;
    if (!allowed) {
      throw new ValidationException(
        this.localeResolutionService.translate(locale, "errors.validation_failed"),
      );
    }
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
      where: { fleetDriverId, trackingEnabled: true },
      order: { lastSeenAt: "DESC", createdAt: "DESC" },
    });
    return devices.find((device) => !device.consentRevokedAt) ?? null;
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
