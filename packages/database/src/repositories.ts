import { eq } from "drizzle-orm";
import type { AccountState, AgeCohort } from "@paramingle/contracts";
import type { Database } from "./client.js";
import type { FieldEncryptor } from "./encryption.js";
import { assertAccountStateTransition } from "./account-state.js";
import { profiles, users } from "./schema.js";

export function normalizeUsername(username: string): string {
  return username.trim().normalize("NFKC").toLowerCase();
}

export interface CreateIdentityInput {
  authSubject: string;
  birthDate?: string;
  cohort?: AgeCohort;
}

export class IdentityRepository {
  constructor(
    private readonly database: Database,
    private readonly birthDateEncryptor: FieldEncryptor,
  ) {}

  async create(input: CreateIdentityInput) {
    if ((input.birthDate === undefined) !== (input.cohort === undefined))
      throw new Error("Birth date and cohort must be stored together");
    const encrypted =
      input.birthDate === undefined
        ? undefined
        : this.birthDateEncryptor.encrypt(input.birthDate);
    const [row] = await this.database
      .insert(users)
      .values({
        authSubject: input.authSubject,
        ...(encrypted === undefined
          ? {}
          : {
              birthDateCiphertext: encrypted.ciphertext,
              birthDateKeyVersion: encrypted.keyVersion,
              ageCohort: input.cohort,
            }),
      })
      .returning({
        id: users.id,
        accountState: users.accountState,
        ageCohort: users.ageCohort,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
      });
    if (!row) throw new Error("Identity insert returned no row");
    return row;
  }

  async findPublicAccount(id: string) {
    const [row] = await this.database
      .select({
        id: users.id,
        accountState: users.accountState,
        ageCohort: users.ageCohort,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return row ?? null;
  }

  async setState(id: string, state: AccountState) {
    await this.database.transaction(async (transaction) => {
      const [current] = await transaction
        .select({ accountState: users.accountState })
        .from(users)
        .where(eq(users.id, id))
        .for("update")
        .limit(1);
      if (!current) throw new Error("Identity not found");
      assertAccountStateTransition(current.accountState, state);
      await transaction
        .update(users)
        .set({ accountState: state, updatedAt: new Date() })
        .where(eq(users.id, id));
    });
  }
}

export class ProfileRepository {
  constructor(private readonly database: Database) {}
  async create(userId: string, username: string, displayName: string) {
    const [row] = await this.database
      .insert(profiles)
      .values({
        userId,
        username: username.trim(),
        normalizedUsername: normalizeUsername(username),
        displayName: displayName.trim(),
      })
      .returning();
    if (!row) throw new Error("Profile insert returned no row");
    return row;
  }
  async findByUsername(username: string) {
    const [row] = await this.database
      .select()
      .from(profiles)
      .where(eq(profiles.normalizedUsername, normalizeUsername(username)))
      .limit(1);
    return row ?? null;
  }
}
