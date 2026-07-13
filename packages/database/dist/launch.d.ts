import type { Database } from "./client.js";
export type LaunchCapability = "registration" | "matching" | "billing";
export declare function normalizeCountryCode(value: string): string;
export declare class LaunchRepository {
  private readonly db;
  constructor(db: Database);
  availability(countryCode: string): Promise<{
    countryCode: string;
    registrationEnabled: boolean;
    matchingEnabled: boolean;
    billingEnabled: boolean;
    reasonCode: string;
  }>;
  require(
    countryCode: string,
    capability: LaunchCapability,
  ): Promise<{
    countryCode: string;
    registrationEnabled: boolean;
    matchingEnabled: boolean;
    billingEnabled: boolean;
    reasonCode: string;
  }>;
  observeUser(
    userId: string,
    countryCode: string,
    source: string,
  ): Promise<void>;
  requireUser(
    userId: string,
    capability: LaunchCapability,
  ): Promise<{
    countryCode: string;
    registrationEnabled: boolean;
    matchingEnabled: boolean;
    billingEnabled: boolean;
    reasonCode: string;
  }>;
  list(): Promise<
    {
      createdAt: Date;
      updatedAt: Date;
      countryCode: string;
      registrationEnabled: boolean;
      matchingEnabled: boolean;
      billingEnabled: boolean;
      reasonCode: string;
      reviewedAt: Date | null;
      reviewedBy: string | null;
    }[]
  >;
  update(
    actorId: string,
    countryCode: string,
    input: {
      registrationEnabled: boolean;
      matchingEnabled: boolean;
      billingEnabled: boolean;
      reasonCode: string;
      purpose: string;
    },
  ): Promise<{
    createdAt: Date;
    updatedAt: Date;
    countryCode: string;
    registrationEnabled: boolean;
    matchingEnabled: boolean;
    billingEnabled: boolean;
    reasonCode: string;
    reviewedAt: Date | null;
    reviewedBy: string | null;
  }>;
}
