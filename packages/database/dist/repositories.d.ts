import type { AccountState, AgeCohort } from '@strangr/contracts';
import type { Database } from './client.js';
import type { FieldEncryptor } from './encryption.js';
export declare function normalizeUsername(username: string): string;
export interface CreateIdentityInput {
    authSubject: string;
    birthDate?: string;
    cohort?: AgeCohort;
}
export declare class IdentityRepository {
    private readonly database;
    private readonly birthDateEncryptor;
    constructor(database: Database, birthDateEncryptor: FieldEncryptor);
    create(input: CreateIdentityInput): Promise<{
        id: string;
        accountState: "deletion_pending" | "pending_verification" | "onboarding" | "active" | "limited" | "suspended" | "banned" | "deleted";
        ageCohort: "minor_16_17" | "adult_18_plus" | null;
        emailVerified: boolean;
        createdAt: Date;
    }>;
    findPublicAccount(id: string): Promise<{
        id: string;
        accountState: "deletion_pending" | "pending_verification" | "onboarding" | "active" | "limited" | "suspended" | "banned" | "deleted";
        ageCohort: "minor_16_17" | "adult_18_plus" | null;
        emailVerified: boolean;
        createdAt: Date;
    } | null>;
    setState(id: string, state: AccountState): Promise<void>;
}
export declare class ProfileRepository {
    private readonly database;
    constructor(database: Database);
    create(userId: string, username: string, displayName: string): Promise<{
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        username: string;
        normalizedUsername: string;
        displayName: string;
        avatarObjectKey: string | null;
        bio: string;
        interests: string[];
        language: string | null;
        region: string | null;
        status: string;
    }>;
    findByUsername(username: string): Promise<{
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        username: string;
        normalizedUsername: string;
        displayName: string;
        avatarObjectKey: string | null;
        bio: string;
        interests: string[];
        language: string | null;
        region: string | null;
        status: string;
    } | null>;
}
