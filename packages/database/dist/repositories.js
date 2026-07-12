import { eq } from "drizzle-orm";
import { assertAccountStateTransition } from "./account-state.js";
import { profiles, users } from "./schema.js";
export function normalizeUsername(username) {
    return username.trim().normalize("NFKC").toLowerCase();
}
export class IdentityRepository {
    database;
    birthDateEncryptor;
    constructor(database, birthDateEncryptor) {
        this.database = database;
        this.birthDateEncryptor = birthDateEncryptor;
    }
    async create(input) {
        if ((input.birthDate === undefined) !== (input.cohort === undefined))
            throw new Error("Birth date and cohort must be stored together");
        const encrypted = input.birthDate === undefined
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
        if (!row)
            throw new Error("Identity insert returned no row");
        return row;
    }
    async findPublicAccount(id) {
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
    async setState(id, state) {
        await this.database.transaction(async (transaction) => {
            const [current] = await transaction
                .select({ accountState: users.accountState })
                .from(users)
                .where(eq(users.id, id))
                .for("update")
                .limit(1);
            if (!current)
                throw new Error("Identity not found");
            assertAccountStateTransition(current.accountState, state);
            await transaction
                .update(users)
                .set({ accountState: state, updatedAt: new Date() })
                .where(eq(users.id, id));
        });
    }
}
export class ProfileRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async create(userId, username, displayName) {
        const [row] = await this.database
            .insert(profiles)
            .values({
            userId,
            username: username.trim(),
            normalizedUsername: normalizeUsername(username),
            displayName: displayName.trim(),
        })
            .returning();
        if (!row)
            throw new Error("Profile insert returned no row");
        return row;
    }
    async findByUsername(username) {
        const [row] = await this.database
            .select()
            .from(profiles)
            .where(eq(profiles.normalizedUsername, normalizeUsername(username)))
            .limit(1);
        return row ?? null;
    }
}
