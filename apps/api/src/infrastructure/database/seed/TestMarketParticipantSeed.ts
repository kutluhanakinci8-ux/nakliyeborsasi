import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import {
  CompanyParticipantTypeCode,
  CompanyRoleCode,
} from "@nakliyeborsasi/core";
import { CompanyEntity } from "../entities/CompanyEntity";
import { UserAccountEntity } from "../entities/UserAccountEntity";
import { CompanyMembershipEntity } from "../entities/CompanyMembershipEntity";
import { CompanySubscriptionEntity } from "../entities/CompanySubscriptionEntity";
import { FreightListingEntity } from "../entities/FreightListingEntity";

/** Tüm test pazar kullanıcıları için ortak şifre */
export const TEST_MARKET_USER_PASSWORD = "TestPass123!";

type ListingSeed = {
  originCountryCode: string;
  originCityName: string;
  destinationCountryCode: string;
  destinationCityName: string;
  equipmentTypeCode: string;
  weightTonnes: string;
  loadingDateStart: string;
  priceAmount: string;
  priceCurrencyCode: string;
  marketScopeCode: string;
};

type ParticipantSeed = {
  emailLocal: string;
  displayName: string;
  companyLegalName: string;
  countryCode: string;
  participantType: CompanyParticipantTypeCode;
  planCode: string;
  roleCode: CompanyRoleCode;
  listings?: ListingSeed[];
};

const PARTICIPANTS: ParticipantSeed[] = [
  ...buildBatch("yukveren", CompanyParticipantTypeCode.LoadShipper, {
    planCode: "carrier_professional_tr_ua",
    roleCode: CompanyRoleCode.CompanyOwner,
    companies: [
      ["Anadolu Gıda Lojistik", "TR"],
      ["Ege Tekstil İhracat", "TR"],
      ["Marmara Otomotiv Yan Sanayi", "TR"],
      ["Karadeniz Orman Ürünleri", "TR"],
      ["İç Anadolu Tarım Kooperatifi", "TR"],
    ],
    withListings: true,
  }),
  ...buildBatch("yuktasiyan", CompanyParticipantTypeCode.LoadCarrier, {
    planCode: "carrier_professional_tr_ua",
    roleCode: CompanyRoleCode.CompanyOwner,
    companies: [
      ["Atlas Taşımacılık A.Ş.", "TR"],
      ["Doğu Avrupa Filo", "UA"],
      ["Koridor Express", "TR"],
      ["Bosphorus Logistics", "TR"],
      ["Steppe Cargo UA", "UA"],
    ],
    withListings: false,
  }),
  ...buildBatch("yukarayan", CompanyParticipantTypeCode.LoadSeeker, {
    planCode: "carrier_starter_tr_ua",
    roleCode: CompanyRoleCode.Dispatcher,
    companies: [
      ["Merkez Dispetcher Ofis 1", "TR"],
      ["Merkez Dispetcher Ofis 2", "TR"],
      ["Merkez Dispetcher Ofis 3", "UA"],
      ["Merkez Dispetcher Ofis 4", "TR"],
      ["Merkez Dispetcher Ofis 5", "DE"],
    ],
    withListings: false,
  }),
];

function buildBatch(
  emailPrefix: string,
  participantType: CompanyParticipantTypeCode,
  config: {
    planCode: string;
    roleCode: CompanyRoleCode;
    companies: [string, string][];
    withListings: boolean;
  },
): ParticipantSeed[] {
  const lanes: ListingSeed[] = [
    {
      originCountryCode: "TR",
      originCityName: "İstanbul",
      destinationCountryCode: "DE",
      destinationCityName: "Hamburg",
      equipmentTypeCode: "TAUTLINER",
      weightTonnes: "22.00",
      loadingDateStart: "2026-09-28",
      priceAmount: "2450.00",
      priceCurrencyCode: "EUR",
      marketScopeCode: "UA_EU",
    },
    {
      originCountryCode: "TR",
      originCityName: "Ankara",
      destinationCountryCode: "UA",
      destinationCityName: "Lviv",
      equipmentTypeCode: "TAUTLINER",
      weightTonnes: "20.50",
      loadingDateStart: "2026-09-30",
      priceAmount: "1900.00",
      priceCurrencyCode: "EUR",
      marketScopeCode: "UA_EU",
    },
    {
      originCountryCode: "UA",
      originCityName: "Kyiv",
      destinationCountryCode: "PL",
      destinationCityName: "Warsaw",
      equipmentTypeCode: "REFRIGERATED",
      weightTonnes: "18.00",
      loadingDateStart: "2026-10-02",
      priceAmount: "2800.00",
      priceCurrencyCode: "EUR",
      marketScopeCode: "UA_EU",
    },
    {
      originCountryCode: "TR",
      originCityName: "İzmir",
      destinationCountryCode: "RO",
      destinationCityName: "Bucharest",
      equipmentTypeCode: "TAUTLINER",
      weightTonnes: "21.00",
      loadingDateStart: "2026-10-05",
      priceAmount: "1650.00",
      priceCurrencyCode: "EUR",
      marketScopeCode: "UA_EU",
    },
    {
      originCountryCode: "TR",
      originCityName: "Bursa",
      destinationCountryCode: "BG",
      destinationCityName: "Sofia",
      equipmentTypeCode: "TAUTLINER",
      weightTonnes: "19.00",
      loadingDateStart: "2026-10-08",
      priceAmount: "1200.00",
      priceCurrencyCode: "EUR",
      marketScopeCode: "UA_EU",
    },
  ];

  return config.companies.map(([legalName, countryCode], index) => {
    const num = String(index + 1).padStart(2, "0");
    return {
      emailLocal: `${emailPrefix}${num}@test.nakliyeborsasi.local`,
      displayName: `${legalName} — Test ${num}`,
      companyLegalName: legalName,
      countryCode,
      participantType,
      planCode: config.planCode,
      roleCode: config.roleCode,
      listings: config.withListings ? [lanes[index]] : undefined,
    };
  });
}

export async function seedTestMarketParticipants(deps: {
  companyRepository: Repository<CompanyEntity>;
  userAccountRepository: Repository<UserAccountEntity>;
  companyMembershipRepository: Repository<CompanyMembershipEntity>;
  companySubscriptionRepository: Repository<CompanySubscriptionEntity>;
  freightListingRepository: Repository<FreightListingEntity>;
}): Promise<void> {
  const passwordHash = await bcrypt.hash(TEST_MARKET_USER_PASSWORD, 12);

  for (const participant of PARTICIPANTS) {
    const email = participant.emailLocal.toLowerCase();
    const existingUser = await deps.userAccountRepository.findOne({
      where: { emailAddress: email },
    });
    if (existingUser) {
      continue;
    }

    const company = await deps.companyRepository.save(
      deps.companyRepository.create({
        legalName: participant.companyLegalName,
        countryCode: participant.countryCode,
        participantTypeCode: participant.participantType,
      }),
    );

    const user = await deps.userAccountRepository.save(
      deps.userAccountRepository.create({
        emailAddress: email,
        passwordHash,
        displayName: participant.displayName,
      }),
    );

    await deps.companyMembershipRepository.save(
      deps.companyMembershipRepository.create({
        companyId: company.id,
        userId: user.id,
        roleCode: participant.roleCode,
      }),
    );

    await deps.companySubscriptionRepository.save(
      deps.companySubscriptionRepository.create({
        companyId: company.id,
        planCode: participant.planCode,
        isActive: true,
      }),
    );

    if (participant.listings?.length) {
      for (const listing of participant.listings) {
        await deps.freightListingRepository.save(
          deps.freightListingRepository.create({
            ownerCompanyId: company.id,
            ...listing,
          }),
        );
      }
    }
  }
}
