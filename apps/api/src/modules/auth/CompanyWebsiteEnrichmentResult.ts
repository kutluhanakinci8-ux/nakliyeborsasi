export type CompanyWebsiteEnrichmentResult = {
  sourceUrl: string;
  companyLegalName: string | null;
  tradeName: string | null;
  emailAddress: string | null;
  phone: string | null;
  taxOrRegistryId: string | null;
  addressLine: string | null;
  city: string | null;
  servicesSummary: string | null;
  logoUrl: string | null;
};
