/** Firmanın pazardaki rolü (test ve raporlama için) */
export enum CompanyParticipantTypeCode {
  /** Yük veren — ilan yayınlar */
  LoadShipper = "LOAD_SHIPPER",
  /** Yük taşıyan — kapasite / filo */
  LoadCarrier = "LOAD_CARRIER",
  /** Yük arayan — marketplace arama odaklı */
  LoadSeeker = "LOAD_SEEKER",
}
