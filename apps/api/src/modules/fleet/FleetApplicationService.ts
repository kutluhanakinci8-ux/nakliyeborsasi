import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import {
  CompanyParticipantTypeCode,
  FleetAssignmentTypeCode,
  FleetDriverStatusCode,
  FleetVehicleStatusCode,
  ResourceNotFoundException,
  SubscriptionModuleCode,
  ValidationException,
} from "@nakliyeborsasi/core";
import { CompanyEntity } from "../../infrastructure/database/entities/CompanyEntity";
import { FleetDriverEntity } from "../../infrastructure/database/entities/FleetDriverEntity";
import { FleetDriverVehicleAssignmentEntity } from "../../infrastructure/database/entities/FleetDriverVehicleAssignmentEntity";
import { FleetVehicleEntity } from "../../infrastructure/database/entities/FleetVehicleEntity";
import { ModularSubscriptionEntitlementService } from "../subscription/ModularSubscriptionEntitlementService";
import { LocaleResolutionService } from "../localization/LocaleResolutionService";
import { CreateFleetDriverRequestDto } from "./CreateFleetDriverRequestDto";
import { UpdateFleetDriverRequestDto } from "./UpdateFleetDriverRequestDto";
import { CreateFleetVehicleRequestDto } from "./CreateFleetVehicleRequestDto";
import { UpdateFleetVehicleRequestDto } from "./UpdateFleetVehicleRequestDto";
import { AssignFleetDriverVehicleRequestDto } from "./AssignFleetDriverVehicleRequestDto";
import { FleetMapper } from "./FleetMapper";
import { normalizeLicensePlate } from "./FleetPlateNormalization";

@Injectable()
export class FleetApplicationService {
  public constructor(
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,
    @InjectRepository(FleetDriverEntity)
    private readonly driverRepository: Repository<FleetDriverEntity>,
    @InjectRepository(FleetVehicleEntity)
    private readonly vehicleRepository: Repository<FleetVehicleEntity>,
    @InjectRepository(FleetDriverVehicleAssignmentEntity)
    private readonly assignmentRepository: Repository<FleetDriverVehicleAssignmentEntity>,
    private readonly modularSubscriptionEntitlementService: ModularSubscriptionEntitlementService,
    private readonly localeResolutionService: LocaleResolutionService,
  ) {}

  public async getOverview(companyId: string, locale: string) {
    await this.assertFleetTenant(companyId, locale);
    const drivers = await this.driverRepository.find({
      where: { companyId },
      order: { displayName: "ASC" },
    });
    const vehicles = await this.vehicleRepository.find({
      where: { companyId },
      order: { licensePlateDisplay: "ASC" },
    });
    const vehiclePlateById = new Map(
      vehicles.map((vehicle) => [vehicle.id, vehicle.licensePlateDisplay]),
    );
    const driverNameById = new Map(
      drivers.map((driver) => [driver.id, driver.displayName]),
    );
    const activeAssignmentCount = await this.assignmentRepository.count({
      where: { companyId, validTo: IsNull() },
    });
    return FleetMapper.toOverview(
      drivers.map((driver) =>
        FleetMapper.toDriverSummary(
          driver,
          driver.activeVehicleId
            ? vehiclePlateById.get(driver.activeVehicleId) ?? null
            : null,
        ),
      ),
      vehicles.map((vehicle) =>
        FleetMapper.toVehicleSummary(
          vehicle,
          vehicle.activeDriverId
            ? driverNameById.get(vehicle.activeDriverId) ?? null
            : null,
        ),
      ),
      activeAssignmentCount,
    );
  }

  public async createDriver(
    companyId: string,
    payload: CreateFleetDriverRequestDto,
    locale: string,
  ) {
    await this.assertFleetTenant(companyId, locale);
    const driver = this.driverRepository.create({
      companyId,
      displayName: payload.displayName.trim(),
      primaryPhoneE164: payload.primaryPhoneE164?.trim() ?? null,
      driverLicenseNumber: payload.driverLicenseNumber?.trim() ?? null,
      driverLicenseCountryCode:
        payload.driverLicenseCountryCode?.toUpperCase() ?? null,
      statusCode: FleetDriverStatusCode.Active,
      linkedUserAccountId: null,
      activeVehicleId: null,
    });
    const saved = await this.driverRepository.save(driver);
    return FleetMapper.toDriverSummary(saved, null);
  }

  public async updateDriver(
    companyId: string,
    driverId: string,
    payload: UpdateFleetDriverRequestDto,
    locale: string,
  ) {
    await this.assertFleetTenant(companyId, locale);
    const driver = await this.findDriverForCompany(companyId, driverId, locale);
    if (payload.displayName !== undefined) {
      driver.displayName = payload.displayName.trim();
    }
    if (payload.primaryPhoneE164 !== undefined) {
      driver.primaryPhoneE164 = payload.primaryPhoneE164?.trim() ?? null;
    }
    if (payload.driverLicenseNumber !== undefined) {
      driver.driverLicenseNumber = payload.driverLicenseNumber?.trim() ?? null;
    }
    if (payload.driverLicenseCountryCode !== undefined) {
      driver.driverLicenseCountryCode =
        payload.driverLicenseCountryCode?.toUpperCase() ?? null;
    }
    if (payload.statusCode !== undefined) {
      driver.statusCode = payload.statusCode;
    }
    const saved = await this.driverRepository.save(driver);
    const plate = saved.activeVehicleId
      ? (
          await this.vehicleRepository.findOne({
            where: { id: saved.activeVehicleId, companyId },
          })
        )?.licensePlateDisplay ?? null
      : null;
    return FleetMapper.toDriverSummary(saved, plate);
  }

  public async createVehicle(
    companyId: string,
    payload: CreateFleetVehicleRequestDto,
    locale: string,
  ) {
    await this.assertFleetTenant(companyId, locale);
    const registrationCountryCode = payload.registrationCountryCode.toUpperCase();
    const licensePlateDisplay = payload.licensePlate.trim();
    const licensePlateNormalized = normalizeLicensePlate(licensePlateDisplay);
    if (!licensePlateNormalized) {
      throw new ValidationException(
        this.localeResolutionService.translate(locale, "errors.validation_failed"),
      );
    }
    const vehicle = this.vehicleRepository.create({
      companyId,
      registrationCountryCode,
      licensePlateDisplay,
      licensePlateNormalized,
      vin: payload.vin?.trim() ?? null,
      equipmentTypeCode: payload.equipmentTypeCode.toUpperCase(),
      payloadCapacityTonnes:
        payload.payloadCapacityTonnes !== undefined
          ? String(payload.payloadCapacityTonnes)
          : null,
      statusCode: FleetVehicleStatusCode.Available,
      internalFleetNumber: payload.internalFleetNumber?.trim() ?? null,
      activeDriverId: null,
    });
    const saved = await this.vehicleRepository.save(vehicle);
    return FleetMapper.toVehicleSummary(saved, null);
  }

  public async updateVehicle(
    companyId: string,
    vehicleId: string,
    payload: UpdateFleetVehicleRequestDto,
    locale: string,
  ) {
    await this.assertFleetTenant(companyId, locale);
    const vehicle = await this.findVehicleForCompany(companyId, vehicleId, locale);
    if (payload.licensePlate !== undefined) {
      const display = payload.licensePlate.trim();
      vehicle.licensePlateDisplay = display;
      vehicle.licensePlateNormalized = normalizeLicensePlate(display);
    }
    if (payload.vin !== undefined) {
      vehicle.vin = payload.vin?.trim() ?? null;
    }
    if (payload.equipmentTypeCode !== undefined) {
      vehicle.equipmentTypeCode = payload.equipmentTypeCode.toUpperCase();
    }
    if (payload.payloadCapacityTonnes !== undefined) {
      vehicle.payloadCapacityTonnes =
        payload.payloadCapacityTonnes !== null
          ? String(payload.payloadCapacityTonnes)
          : null;
    }
    if (payload.statusCode !== undefined) {
      vehicle.statusCode = payload.statusCode;
    }
    if (payload.internalFleetNumber !== undefined) {
      vehicle.internalFleetNumber = payload.internalFleetNumber?.trim() ?? null;
    }
    const saved = await this.vehicleRepository.save(vehicle);
    const driverName = saved.activeDriverId
      ? (
          await this.driverRepository.findOne({
            where: { id: saved.activeDriverId, companyId },
          })
        )?.displayName ?? null
      : null;
    return FleetMapper.toVehicleSummary(saved, driverName);
  }

  public async assignDriverToVehicle(
    companyId: string,
    payload: AssignFleetDriverVehicleRequestDto,
    locale: string,
  ) {
    await this.assertFleetTenant(companyId, locale);
    const driver = await this.findDriverForCompany(
      companyId,
      payload.driverId,
      locale,
    );
    const vehicle = await this.findVehicleForCompany(
      companyId,
      payload.vehicleId,
      locale,
    );
    const assignmentType =
      payload.assignmentTypeCode ?? FleetAssignmentTypeCode.Primary;
    const now = new Date();
    await this.closeOpenAssignments(companyId, driver.id, vehicle.id, now);
    driver.activeVehicleId = vehicle.id;
    vehicle.activeDriverId = driver.id;
    if (vehicle.statusCode === FleetVehicleStatusCode.Available) {
      vehicle.statusCode = FleetVehicleStatusCode.Dispatched;
    }
    await this.driverRepository.save(driver);
    await this.vehicleRepository.save(vehicle);
    const assignment = this.assignmentRepository.create({
      companyId,
      driverId: driver.id,
      vehicleId: vehicle.id,
      assignmentTypeCode: assignmentType,
      validFrom: now,
      validTo: null,
    });
    await this.assignmentRepository.save(assignment);
    return {
      driver: FleetMapper.toDriverSummary(driver, vehicle.licensePlateDisplay),
      vehicle: FleetMapper.toVehicleSummary(vehicle, driver.displayName),
    };
  }

  public async clearAssignment(
    companyId: string,
    driverId: string,
    locale: string,
  ) {
    await this.assertFleetTenant(companyId, locale);
    const driver = await this.findDriverForCompany(companyId, driverId, locale);
    if (!driver.activeVehicleId) {
      return FleetMapper.toDriverSummary(driver, null);
    }
    const vehicle = await this.findVehicleForCompany(
      companyId,
      driver.activeVehicleId,
      locale,
    );
    const now = new Date();
    await this.closeOpenAssignments(companyId, driver.id, vehicle.id, now);
    driver.activeVehicleId = null;
    vehicle.activeDriverId = null;
    if (vehicle.statusCode === FleetVehicleStatusCode.Dispatched) {
      vehicle.statusCode = FleetVehicleStatusCode.Available;
    }
    await this.driverRepository.save(driver);
    await this.vehicleRepository.save(vehicle);
    return FleetMapper.toDriverSummary(driver, null);
  }

  private async closeOpenAssignments(
    companyId: string,
    driverId: string,
    vehicleId: string,
    closedAt: Date,
  ): Promise<void> {
    const openRows = await this.assignmentRepository.find({
      where: [
        { companyId, driverId, validTo: IsNull() },
        { companyId, vehicleId, validTo: IsNull() },
      ],
    });
    for (const row of openRows) {
      row.validTo = closedAt;
    }
    if (openRows.length > 0) {
      await this.assignmentRepository.save(openRows);
    }
    await this.driverRepository.update(
      { companyId, activeVehicleId: vehicleId },
      { activeVehicleId: null },
    );
    await this.vehicleRepository.update(
      { companyId, activeDriverId: driverId },
      { activeDriverId: null },
    );
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

  private async findDriverForCompany(
    companyId: string,
    driverId: string,
    locale: string,
  ): Promise<FleetDriverEntity> {
    const driver = await this.driverRepository.findOne({
      where: { id: driverId, companyId },
    });
    if (!driver) {
      throw new ResourceNotFoundException("FleetDriver", driverId);
    }
    return driver;
  }

  private async findVehicleForCompany(
    companyId: string,
    vehicleId: string,
    locale: string,
  ): Promise<FleetVehicleEntity> {
    const vehicle = await this.vehicleRepository.findOne({
      where: { id: vehicleId, companyId },
    });
    if (!vehicle) {
      throw new ResourceNotFoundException("FleetVehicle", vehicleId);
    }
    return vehicle;
  }
}
