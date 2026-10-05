import { createHash, randomBytes } from "node:crypto";
import { Repository } from "typeorm";
import {
  TELEMETRY_CONSENT_DOCUMENT_VERSION,
  TelemetryEventTypeCode,
} from "@nakliyeborsasi/core";
import { FleetDriverEntity } from "../entities/FleetDriverEntity";
import { FleetTelemetryDeviceEntity } from "../entities/FleetTelemetryDeviceEntity";
import { FleetTelemetryEventEntity } from "../entities/FleetTelemetryEventEntity";
import { UserAccountEntity } from "../entities/UserAccountEntity";
import {
  KUTLUHAN_TEST_DRIVER_EMAIL,
  KUTLUHAN_TEST_DRIVER_PHONE_E164,
} from "./KutluhanTestFleetSeed";

/** Ankara → batı koridoru (demo iz). */
const DEMO_TRAIL: ReadonlyArray<{ lat: number; lng: number }> = [
  { lat: 39.9334, lng: 32.8597 },
  { lat: 39.9421, lng: 32.8124 },
  { lat: 39.9588, lng: 32.7541 },
  { lat: 39.9762, lng: 32.6812 },
  { lat: 39.991, lng: 32.6025 },
  { lat: 40.0124, lng: 32.5108 },
  { lat: 40.0289, lng: 32.4211 },
  { lat: 40.0412, lng: 32.3188 },
  { lat: 40.0555, lng: 32.2104 },
  { lat: 40.0688, lng: 32.0982 },
];

function hashDemoToken(): string {
  return createHash("sha256")
    .update(randomBytes(24))
    .digest("hex");
}

export async function seedKutluhanTelemetryDemo(deps: {
  userAccountRepository: Repository<UserAccountEntity>;
  driverRepository: Repository<FleetDriverEntity>;
  deviceRepository: Repository<FleetTelemetryDeviceEntity>;
  eventRepository: Repository<FleetTelemetryEventEntity>;
}): Promise<void> {
  let driver = await deps.driverRepository.findOne({
    where: { primaryPhoneE164: KUTLUHAN_TEST_DRIVER_PHONE_E164 },
  });
  if (!driver) {
    const driverUser = await deps.userAccountRepository.findOne({
      where: { emailAddress: KUTLUHAN_TEST_DRIVER_EMAIL },
    });
    if (driverUser) {
      driver = await deps.driverRepository.findOne({
        where: { linkedUserAccountId: driverUser.id },
      });
    }
  }
  if (!driver) {
    return;
  }

  const existingEvents = await deps.eventRepository.count({
    where: { fleetDriverId: driver.id },
  });
  if (existingEvents > 0) {
    const device = await deps.deviceRepository.findOne({
      where: { fleetDriverId: driver.id, trackingEnabled: true },
      order: { lastSeenAt: "DESC" },
    });
    if (device) {
      const lastPoint = DEMO_TRAIL[DEMO_TRAIL.length - 1];
      device.lastSeenAt = new Date();
      device.lastLatitude = lastPoint.lat;
      device.lastLongitude = lastPoint.lng;
      device.lastSpeedKmh = 68;
      await deps.deviceRepository.save(device);
    }
    return;
  }

  const now = Date.now();
  const lastPoint = DEMO_TRAIL[DEMO_TRAIL.length - 1];
  const device = await deps.deviceRepository.save(
    deps.deviceRepository.create({
      companyId: driver.companyId,
      fleetDriverId: driver.id,
      platformCode: "WEB",
      deviceLabel: "Kutluhan demo telemetri",
      ingestTokenHash: hashDemoToken(),
      consentDocumentVersion: TELEMETRY_CONSENT_DOCUMENT_VERSION,
      consentGrantedAt: new Date(now - 60 * 60 * 1000),
      consentRevokedAt: null,
      trackingEnabled: true,
      lastSeenAt: new Date(now - 30 * 1000),
      lastLatitude: lastPoint.lat,
      lastLongitude: lastPoint.lng,
      lastSpeedKmh: 72,
      activeTripCorrelationId: null,
      interpreterStateJson: null,
    }),
  );

  const events: FleetTelemetryEventEntity[] = [];
  DEMO_TRAIL.forEach((point, index) => {
    const recordedAt = new Date(now - (DEMO_TRAIL.length - index) * 3 * 60 * 1000);
    events.push(
      deps.eventRepository.create({
        companyId: driver.companyId,
        fleetDriverId: driver.id,
        deviceId: device.id,
        eventTypeCode: TelemetryEventTypeCode.LocationSample,
        recordedAt,
        latitude: point.lat,
        longitude: point.lng,
        speedKmh: 55 + index * 2,
        headingDegrees: 270,
        horizontalAccuracyMeters: 12,
        severityCode: null,
        tripCorrelationId: null,
        payloadJson: { demoSeed: true, label: "kutluhan-trail" },
        ingestBatchId: "kutluhan-telemetry-demo-seed",
      }),
    );
  });
  await deps.eventRepository.save(events);
}
