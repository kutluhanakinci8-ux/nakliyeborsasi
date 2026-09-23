/** Yük çıkış / varış noktası türü (uluslararası borsa sözlüğü). */
export const FreightPlaceKindCode = {
  City: "CITY",
  Port: "PORT",
  Terminal: "TERMINAL",
  Warehouse: "WAREHOUSE",
  DeliveryPoint: "DELIVERY_POINT",
  Customs: "CUSTOMS",
} as const;

export type FreightPlaceKindCode =
  (typeof FreightPlaceKindCode)[keyof typeof FreightPlaceKindCode];
