import { z } from "zod";

// Trade application contract — must stay in sync with the BDC website's
// `lib/trade-schema.ts`. The website POSTs this exact shape to
// /api/storefront/trade-application on this app.
//
// If you change a field here, update the website schema in the same PR
// and bump both deployments together.

export const TRADE_PROFESSIONS = [
  "Interior Designer",
  "Architect",
  "Landscape Architect",
  "General Contractor / Design-Build",
  "Hospitality Designer",
  "Developer",
  "Showroom / Retailer",
  "Other",
] as const;

export const TRADE_PROJECT_TYPES = [
  "Residential — Single Family",
  "Residential — Multifamily",
  "Hospitality (Hotel, Restaurant, Bar)",
  "Commercial / Workplace",
  "Healthcare / Wellness",
  "Retail",
] as const;

export const TRADE_VOLUME_BANDS = [
  "Under $10k",
  "$10k–$50k",
  "$50k–$150k",
  "$150k–$500k",
  "$500k+",
] as const;

export const TRADE_HEAR_ABOUT = [
  "Search engine",
  "Instagram",
  "Pinterest",
  "Architectural Digest / Press",
  "Referral from a peer",
  "Trade show",
  "Other",
] as const;

export const tradeApplicationSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  title: z.string().max(120).optional().or(z.literal("")),
  email: z.string().email().max(160),
  phone: z.string().min(7).max(40),

  firmName: z.string().min(1).max(160),
  profession: z.enum(TRADE_PROFESSIONS),
  website: z.string().max(200).optional().or(z.literal("")),
  instagram: z.string().max(80).optional().or(z.literal("")),
  yearEstablished: z
    .string()
    .regex(/^\d{4}$|^$/)
    .optional()
    .or(z.literal("")),

  city: z.string().min(1).max(80),
  region: z.string().min(1).max(80),
  country: z.string().min(2).max(80),
  postalCode: z.string().max(20).optional().or(z.literal("")),

  credentialType: z.string().max(120).optional().or(z.literal("")),
  credentialNumber: z.string().max(120).optional().or(z.literal("")),
  resaleCert: z.string().max(120).optional().or(z.literal("")),
  ein: z.string().max(40).optional().or(z.literal("")),

  projectTypes: z.array(z.enum(TRADE_PROJECT_TYPES)).min(1),
  annualVolume: z.enum(TRADE_VOLUME_BANDS),
  hearAbout: z.enum(TRADE_HEAR_ABOUT),

  notes: z.string().max(2000).optional().or(z.literal("")),
  agreeTerms: z.literal(true),
});

export type TradeApplicationPayload = z.infer<typeof tradeApplicationSchema>;
