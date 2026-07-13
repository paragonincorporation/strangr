import { eq } from "drizzle-orm";
import type { MatchingPreferences } from "@paramingle/contracts";
import type { Database } from "./client.js";
import { matchingPreferences, profiles, userCountryState } from "./schema.js";
import { EntitlementService } from "./entitlements.js";

export const GENDER_FILTER_ENTITLEMENT = "matching.gender_filter";

export type MatchCriteria = MatchingPreferences & {
  country: string;
  language: string | null;
  interests: string[];
};

export { EntitlementService as EntitlementRepository } from "./entitlements.js";

export class MatchingPreferenceRepository {
  constructor(
    private readonly db: Database,
    private readonly entitlements = new EntitlementService(db),
  ) {}

  async get(userId: string) {
    const [row] = await this.db
      .select()
      .from(matchingPreferences)
      .where(eq(matchingPreferences.userId, userId))
      .limit(1);
    const genderFilterEntitled = await this.entitlements.has(
      userId,
      GENDER_FILTER_ENTITLEMENT,
    );
    return {
      countryPreference: row?.countryPreference ?? null,
      languagePreference: row?.languagePreference ?? null,
      interestTags: row?.interestTags ?? [],
      genderIdentity: row?.genderIdentity ?? "prefer_not_to_say",
      genderPreference: row?.genderPreference ?? "everyone",
      allowPreferenceRelaxation: row?.allowPreferenceRelaxation ?? false,
      genderFilterEntitled,
    } as const;
  }

  async update(userId: string, input: MatchingPreferences) {
    const entitled = await this.entitlements.has(
      userId,
      GENDER_FILTER_ENTITLEMENT,
    );
    if (input.genderPreference !== "everyone" && !entitled)
      throw new Error("entitlement_required");
    const interestTags = [...new Set(input.interestTags.map((x) => x.trim()))];
    await this.db
      .insert(matchingPreferences)
      .values({ ...input, userId, interestTags })
      .onConflictDoUpdate({
        target: matchingPreferences.userId,
        set: { ...input, interestTags, updatedAt: new Date() },
      });
    return this.get(userId);
  }

  async criteria(userId: string): Promise<MatchCriteria> {
    const preferences = await this.get(userId);
    const [identity] = await this.db
      .select({
        country: userCountryState.lastObservedCountry,
        language: profiles.language,
        interests: profiles.interests,
      })
      .from(userCountryState)
      .innerJoin(profiles, eq(profiles.userId, userCountryState.userId))
      .where(eq(userCountryState.userId, userId))
      .limit(1);
    if (!identity) throw new Error("matching_preferences_unavailable");
    return {
      country: identity.country,
      language: identity.language,
      interests: identity.interests,
      countryPreference: preferences.countryPreference,
      languagePreference: preferences.languagePreference,
      interestTags: preferences.interestTags,
      genderIdentity: preferences.genderIdentity,
      genderPreference: preferences.genderFilterEntitled
        ? preferences.genderPreference
        : "everyone",
      allowPreferenceRelaxation: preferences.allowPreferenceRelaxation,
    };
  }
}
