import type { MatchingPreferences } from "@paramingle/contracts";
import type { Database } from "./client.js";
import { EntitlementService } from "./entitlements.js";
export declare const GENDER_FILTER_ENTITLEMENT = "matching.gender_filter";
export type MatchCriteria = MatchingPreferences & {
  country: string;
  language: string | null;
  interests: string[];
};
export { EntitlementService as EntitlementRepository } from "./entitlements.js";
export declare class MatchingPreferenceRepository {
  private readonly db;
  private readonly entitlements;
  constructor(db: Database, entitlements?: EntitlementService);
  get(userId: string): Promise<{
    readonly countryPreference: string | null;
    readonly languagePreference: string | null;
    readonly interestTags: string[];
    readonly genderIdentity:
      "man" | "woman" | "nonbinary" | "prefer_not_to_say";
    readonly genderPreference: "everyone" | "nonbinary" | "men" | "women";
    readonly allowPreferenceRelaxation: boolean;
    readonly genderFilterEntitled: boolean;
  }>;
  update(
    userId: string,
    input: MatchingPreferences,
  ): Promise<{
    readonly countryPreference: string | null;
    readonly languagePreference: string | null;
    readonly interestTags: string[];
    readonly genderIdentity:
      "man" | "woman" | "nonbinary" | "prefer_not_to_say";
    readonly genderPreference: "everyone" | "nonbinary" | "men" | "women";
    readonly allowPreferenceRelaxation: boolean;
    readonly genderFilterEntitled: boolean;
  }>;
  criteria(userId: string): Promise<MatchCriteria>;
}
