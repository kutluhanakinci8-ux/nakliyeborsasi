import { Repository } from "typeorm";
import { FreightPlaceKindCode } from "@nakliyeborsasi/core";
import { FreightListingEntity } from "../entities/FreightListingEntity";

type PlaceHint = {
  placeName: string;
  placeKindCode: string;
};

const ORIGIN_HINTS: Record<string, PlaceHint> = {
  "TR:İstanbul": {
    placeName: "MIP Ambarlı Limanı",
    placeKindCode: FreightPlaceKindCode.Port,
  },
  "TR:Ankara": {
    placeName: "Ostim Lojistik Üssü",
    placeKindCode: FreightPlaceKindCode.Warehouse,
  },
  "TR:İzmir": {
    placeName: "Alsancak Limanı",
    placeKindCode: FreightPlaceKindCode.Port,
  },
  "TR:Bursa": {
    placeName: "Bursa OSB — Teslimat kapısı",
    placeKindCode: FreightPlaceKindCode.DeliveryPoint,
  },
  "UA:Kyiv": {
    placeName: "Kyiv Logistics Park",
    placeKindCode: FreightPlaceKindCode.Warehouse,
  },
  "UA:Odesa": {
    placeName: "Port of Odesa (Chornomorsk)",
    placeKindCode: FreightPlaceKindCode.Port,
  },
};

const DESTINATION_HINTS: Record<string, PlaceHint> = {
  "DE:Hamburg": {
    placeName: "CTB Container Terminal Hamburg",
    placeKindCode: FreightPlaceKindCode.Port,
  },
  "DE:Berlin": {
    placeName: "Berlin Westhafen",
    placeKindCode: FreightPlaceKindCode.Port,
  },
  "UA:Lviv": {
    placeName: "Lviv — Rava-Ruska depo bölgesi",
    placeKindCode: FreightPlaceKindCode.Warehouse,
  },
  "UA:Odesa": {
    placeName: "Odesa serbest bölge teslimat",
    placeKindCode: FreightPlaceKindCode.DeliveryPoint,
  },
  "PL:Warsaw": {
    placeName: "Warszawa Praga DC",
    placeKindCode: FreightPlaceKindCode.DeliveryPoint,
  },
  "RO:Bucharest": {
    placeName: "Bucharest Otopeni Cargo Hub",
    placeKindCode: FreightPlaceKindCode.Warehouse,
  },
  "BG:Sofia": {
    placeName: "Sofia Ring DC",
    placeKindCode: FreightPlaceKindCode.DeliveryPoint,
  },
};

function hintKey(countryCode: string, cityName: string): string {
  return `${countryCode.trim().toUpperCase()}:${cityName.trim()}`;
}

export async function enrichFreightListingPlaces(
  freightListingRepository: Repository<FreightListingEntity>,
): Promise<void> {
  const listings = await freightListingRepository.find();
  for (const listing of listings) {
    const originKey = hintKey(listing.originCountryCode, listing.originCityName);
    const destKey = hintKey(
      listing.destinationCountryCode,
      listing.destinationCityName,
    );
    const originHint = ORIGIN_HINTS[originKey];
    const destHint = DESTINATION_HINTS[destKey];
    let dirty = false;

    if (!listing.originPlaceName && originHint) {
      listing.originPlaceName = originHint.placeName;
      listing.originPlaceKindCode = originHint.placeKindCode;
      dirty = true;
    }
    if (!listing.destinationPlaceName && destHint) {
      listing.destinationPlaceName = destHint.placeName;
      listing.destinationPlaceKindCode = destHint.placeKindCode;
      dirty = true;
    }
    if (dirty) {
      await freightListingRepository.save(listing);
    }
  }
}
