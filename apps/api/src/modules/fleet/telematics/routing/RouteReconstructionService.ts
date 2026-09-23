import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { createHash } from "node:crypto";
import { Repository } from "typeorm";
import {
  FleetRoutePoint,
  lineStringLengthMeters,
  PolylineSimplifier,
  TelemetryGpsFilter,
  TelemetryRoadGeometryStatusCode,
  TelemetryRouteMatchingJobStatusCode,
  TelemetryRouteMatchingProviderCode,
  type FleetRouteSpeedSegment,
  type GeoJsonLineString,
} from "@nakliyeborsasi/core";
import { FleetMatchedRouteEntity } from "../../../../infrastructure/database/entities/FleetMatchedRouteEntity";
import { FleetRouteMatchingJobEntity } from "../../../../infrastructure/database/entities/FleetRouteMatchingJobEntity";
import { FleetTelemetryEventEntity } from "../../../../infrastructure/database/entities/FleetTelemetryEventEntity";
import { TelemetryEventTypeCode } from "@nakliyeborsasi/core";
import { MoreThan } from "typeorm";
import { OsrmRoutingClient, type LatLngSample } from "./OsrmRoutingClient";
import { RouteSpeedSegmentBuilder } from "./RouteSpeedSegmentBuilder";
import type { RouteMatchingQueuePayload } from "./TelemetryMatchingQueueService";

export type ReconstructedRoute = {
  roadGeometry: GeoJsonLineString | null;
  roadGeometryStatus: TelemetryRoadGeometryStatusCode;
  matchedRouteId: string | null;
  distanceKm: number | null;
  speedSegments: FleetRouteSpeedSegment[];
  providerCode: string;
};

@Injectable()
export class RouteReconstructionService {
  private readonly logger = new Logger(RouteReconstructionService.name);

  public constructor(
    @InjectRepository(FleetMatchedRouteEntity)
    private readonly matchedRouteRepository: Repository<FleetMatchedRouteEntity>,
    @InjectRepository(FleetRouteMatchingJobEntity)
    private readonly jobRepository: Repository<FleetRouteMatchingJobEntity>,
    @InjectRepository(FleetTelemetryEventEntity)
    private readonly eventRepository: Repository<FleetTelemetryEventEntity>,
    private readonly osrmRoutingClient: OsrmRoutingClient,
  ) {}

  public buildFingerprint(
    routePoints: readonly FleetRoutePoint[],
    windowStart: Date,
    windowEnd: Date,
  ): string {
    const digest = createHash("sha256");
    digest.update(windowStart.toISOString());
    digest.update(windowEnd.toISOString());
    digest.update(String(routePoints.length));
    if (routePoints.length > 0) {
      const first = routePoints[0];
      const last = routePoints[routePoints.length - 1];
      digest.update(`${first.recordedAt}:${first.latitude},${first.longitude}`);
      digest.update(`${last.recordedAt}:${last.latitude},${last.longitude}`);
    }
    return digest.digest("hex").slice(0, 32);
  }

  public async resolveRouteGeometry(params: {
    companyId: string;
    fleetDriverId: string;
    tripCorrelationId: string | null;
    windowStart: Date;
    windowEnd: Date;
    routePoints: readonly FleetRoutePoint[];
    preferMatched: boolean;
  }): Promise<ReconstructedRoute> {
    const filtered = TelemetryGpsFilter.filterForRoute(
      params.routePoints.map((point) => ({
        latitude: point.latitude,
        longitude: point.longitude,
        recordedAt: point.recordedAt,
        speedKmh: point.speedKmh,
      })),
    );
    const simplified = PolylineSimplifier.simplify(filtered, 25);
    const fingerprint = this.buildFingerprint(
      params.routePoints,
      params.windowStart,
      params.windowEnd,
    );

    const cached = await this.matchedRouteRepository.findOne({
      where: {
        fleetDriverId: params.fleetDriverId,
        windowStart: params.windowStart,
        windowEnd: params.windowEnd,
        inputFingerprint: fingerprint,
      },
      order: { matchedAt: "DESC" },
    });
    if (cached) {
      return this.fromEntity(cached, params.routePoints);
    }

    const latLngSamples: LatLngSample[] = simplified.map((point) => ({
      latitude: point.latitude,
      longitude: point.longitude,
    }));

    let geometry: GeoJsonLineString | null = null;
    let provider = TelemetryRouteMatchingProviderCode.OsrmSegmentRoute;

    if (params.preferMatched && latLngSamples.length >= 3) {
      geometry = await this.osrmRoutingClient.mapMatch(latLngSamples);
      if (geometry) {
        provider = TelemetryRouteMatchingProviderCode.OsrmMapMatch;
      }
    }

    if (!geometry) {
      geometry = await this.osrmRoutingClient.buildSegmentRoute(latLngSamples);
    }

    if (!geometry || geometry.coordinates.length < 2) {
      return {
        roadGeometry: null,
        roadGeometryStatus: TelemetryRoadGeometryStatusCode.FallbackRaw,
        matchedRouteId: null,
        distanceKm: null,
        speedSegments: [],
        providerCode: TelemetryRouteMatchingProviderCode.FallbackRaw,
      };
    }

    const speedSegments = RouteSpeedSegmentBuilder.build(
      geometry,
      params.routePoints,
    );
    const distanceKm =
      Math.round(
        (lineStringLengthMeters(
          geometry.coordinates.map(
            (position) => [position[0], position[1]] as [number, number],
          ),
        ) /
          1000) *
          100,
      ) / 100;

    const saved = await this.matchedRouteRepository.save(
      this.matchedRouteRepository.create({
        companyId: params.companyId,
        fleetDriverId: params.fleetDriverId,
        tripCorrelationId: params.tripCorrelationId,
        windowStart: params.windowStart,
        windowEnd: params.windowEnd,
        geometryJson: geometry,
        speedSegmentsJson: speedSegments.map((segment) => ({
          coordinates: segment.coordinates.map(
            (coordinate) => [coordinate[0], coordinate[1]] as [number, number],
          ),
          speedKmh: segment.speedKmh,
        })),
        sourcePointCount: params.routePoints.length,
        distanceKm,
        providerCode: provider,
        matchedAt: new Date(),
        inputFingerprint: fingerprint,
      }),
    );

    return {
      roadGeometry: geometry,
      roadGeometryStatus: TelemetryRoadGeometryStatusCode.Ready,
      matchedRouteId: saved.id,
      distanceKm,
      speedSegments,
      providerCode: provider,
    };
  }

  public async enqueueRebuildJob(
    payload: RouteMatchingQueuePayload,
  ): Promise<void> {
    const existing = await this.jobRepository.findOne({
      where: {
        fleetDriverId: payload.fleetDriverId,
        windowStart: new Date(payload.windowStartIso),
        windowEnd: new Date(payload.windowEndIso),
        statusCode: TelemetryRouteMatchingJobStatusCode.Pending,
      },
    });
    if (existing) {
      return;
    }
    await this.jobRepository.save(
      this.jobRepository.create({
        companyId: payload.companyId,
        fleetDriverId: payload.fleetDriverId,
        tripCorrelationId: payload.tripCorrelationId,
        windowStart: new Date(payload.windowStartIso),
        windowEnd: new Date(payload.windowEndIso),
        statusCode: TelemetryRouteMatchingJobStatusCode.Pending,
        attemptCount: 0,
        lastError: null,
      }),
    );
  }

  public async processPendingJobs(limit = 5): Promise<void> {
    const jobs = await this.jobRepository.find({
      where: { statusCode: TelemetryRouteMatchingJobStatusCode.Pending },
      order: { createdAt: "ASC" },
      take: limit,
    });
    for (const job of jobs) {
      job.statusCode = TelemetryRouteMatchingJobStatusCode.Running;
      job.attemptCount += 1;
      await this.jobRepository.save(job);
      try {
        const events = await this.eventRepository.find({
          where: {
            companyId: job.companyId,
            fleetDriverId: job.fleetDriverId,
            recordedAt: MoreThan(job.windowStart),
            eventTypeCode: TelemetryEventTypeCode.LocationSample,
          },
          order: { recordedAt: "ASC" },
          take: 800,
        });
        const routePoints: FleetRoutePoint[] = events
          .filter(
            (event) => event.latitude !== null && event.longitude !== null,
          )
          .map((event) => ({
            recordedAt: event.recordedAt.toISOString(),
            latitude: event.latitude as number,
            longitude: event.longitude as number,
            speedKmh: event.speedKmh,
            headingDegrees: event.headingDegrees,
          }));
        await this.resolveRouteGeometry({
          companyId: job.companyId,
          fleetDriverId: job.fleetDriverId,
          tripCorrelationId: job.tripCorrelationId,
          windowStart: job.windowStart,
          windowEnd: job.windowEnd,
          routePoints,
          preferMatched: true,
        });
        job.statusCode = TelemetryRouteMatchingJobStatusCode.Done;
        job.lastError = null;
        await this.jobRepository.save(job);
      } catch (error) {
        const message = error instanceof Error ? error.message : "job failed";
        job.statusCode =
          job.attemptCount >= 3
            ? TelemetryRouteMatchingJobStatusCode.Failed
            : TelemetryRouteMatchingJobStatusCode.Pending;
        job.lastError = message;
        await this.jobRepository.save(job);
        this.logger.warn(`Route matching job ${job.id} failed: ${message}`);
      }
    }
  }

  private fromEntity(
    entity: FleetMatchedRouteEntity,
    routePoints: readonly FleetRoutePoint[],
  ): ReconstructedRoute {
    const geometry = entity.geometryJson as GeoJsonLineString;
    const speedSegments =
      entity.speedSegmentsJson ??
      RouteSpeedSegmentBuilder.build(geometry, routePoints);
    return {
      roadGeometry: geometry,
      roadGeometryStatus: TelemetryRoadGeometryStatusCode.Ready,
      matchedRouteId: entity.id,
      distanceKm: entity.distanceKm,
      speedSegments,
      providerCode: entity.providerCode,
    };
  }
}
