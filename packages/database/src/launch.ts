import { asc, eq } from "drizzle-orm";
import type { Database } from "./client.js";
import { adminAuditLogs, launchCountries, userCountryState } from "./schema.js";

export type LaunchCapability = "registration" | "matching" | "billing";

export function normalizeCountryCode(value: string) {
  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) throw new Error("invalid_country");
  return code;
}

export class LaunchRepository {
  constructor(private readonly db: Database) {}

  async availability(countryCode: string) {
    const code = normalizeCountryCode(countryCode);
    const [row] = await this.db
      .select()
      .from(launchCountries)
      .where(eq(launchCountries.countryCode, code))
      .limit(1);
    return {
      countryCode: code,
      registrationEnabled: row?.registrationEnabled ?? false,
      matchingEnabled: row?.matchingEnabled ?? false,
      billingEnabled: row?.billingEnabled ?? false,
      reasonCode: row?.reasonCode ?? "not_reviewed",
    };
  }

  async require(countryCode: string, capability: LaunchCapability) {
    const state = await this.availability(countryCode);
    const allowed =
      capability === "registration"
        ? state.registrationEnabled
        : capability === "matching"
          ? state.matchingEnabled
          : state.billingEnabled;
    if (!allowed) throw new Error("country_unavailable");
    return state;
  }

  async observeUser(userId: string, countryCode: string, source: string) {
    const code = normalizeCountryCode(countryCode);
    await this.db
      .insert(userCountryState)
      .values({
        userId,
        registrationCountry: code,
        lastObservedCountry: code,
        countrySource: source,
      })
      .onConflictDoUpdate({
        target: userCountryState.userId,
        set: {
          lastObservedCountry: code,
          countrySource: source,
          checkedAt: new Date(),
          updatedAt: new Date(),
        },
      });
  }

  async requireUser(userId: string, capability: LaunchCapability) {
    const [country] = await this.db
      .select({ code: userCountryState.lastObservedCountry })
      .from(userCountryState)
      .where(eq(userCountryState.userId, userId))
      .limit(1);
    if (!country) throw new Error("country_unavailable");
    return this.require(country.code, capability);
  }

  async list() {
    return this.db
      .select()
      .from(launchCountries)
      .orderBy(asc(launchCountries.countryCode));
  }

  async update(
    actorId: string,
    countryCode: string,
    input: {
      registrationEnabled: boolean;
      matchingEnabled: boolean;
      billingEnabled: boolean;
      reasonCode: string;
      purpose: string;
    },
  ) {
    const code = normalizeCountryCode(countryCode);
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(launchCountries)
        .values({
          countryCode: code,
          registrationEnabled: input.registrationEnabled,
          matchingEnabled: input.matchingEnabled,
          billingEnabled: input.billingEnabled,
          reasonCode: input.reasonCode,
          reviewedAt: new Date(),
          reviewedBy: actorId,
        })
        .onConflictDoUpdate({
          target: launchCountries.countryCode,
          set: {
            registrationEnabled: input.registrationEnabled,
            matchingEnabled: input.matchingEnabled,
            billingEnabled: input.billingEnabled,
            reasonCode: input.reasonCode,
            reviewedAt: new Date(),
            reviewedBy: actorId,
            updatedAt: new Date(),
          },
        })
        .returning();
      await tx.insert(adminAuditLogs).values({
        actorId,
        action: "launch_country.update",
        targetType: "launch_country",
        targetId: actorId,
        purpose: input.purpose,
        result: "success",
        changeSummary: {
          countryCode: code,
          registrationEnabled: input.registrationEnabled,
          matchingEnabled: input.matchingEnabled,
          billingEnabled: input.billingEnabled,
          reasonCode: input.reasonCode,
        },
      });
      return row!;
    });
  }
}
