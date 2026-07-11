import { randomUUID } from 'node:crypto'
import {
  createAesGcmFieldEncryptor,
  createDatabase,
  IdentityRepository,
  ProfileRepository,
  users,
} from '@strangr/database'
import { sql } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, test } from 'vitest'

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://strangr:strangr_local_only@localhost:5432/strangr'
const { db, pool } = createDatabase(databaseUrl)
const encryptor = createAesGcmFieldEncryptor(new Uint8Array(32).fill(9), 'integration-v1')
const identities = new IdentityRepository(db, encryptor)
const profileRepository = new ProfileRepository(db)

beforeEach(async () => {
  await db.execute(sql`truncate table users cascade`)
})
afterAll(async () => {
  await pool.end()
})

describe('identity persistence', () => {
  test('encrypts birth date and omits it from public serialization', async () => {
    const identity = await identities.create({
      authSubject: randomUUID(),
      birthDate: '2000-01-02',
      cohort: 'adult_18_plus',
    })
    const raw = await db.select().from(users)
    expect(raw[0]?.birthDateCiphertext).not.toContain('2000-01-02')
    const publicAccount = await identities.findPublicAccount(identity.id)
    expect(JSON.stringify(publicAccount)).not.toContain('birthDate')
    expect(publicAccount?.ageCohort).toBe('adult_18_plus')
  })

  test('lets the unique normalized username constraint decide a race', async () => {
    const first = await identities.create({ authSubject: randomUUID() })
    const second = await identities.create({ authSubject: randomUUID() })
    const results = await Promise.allSettled([
      profileRepository.create(first.id, 'Ada_One', 'Ada'),
      profileRepository.create(second.id, 'ada_one', 'Other Ada'),
    ])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1)
  })

  test('enforces complete birth-date encryption metadata', async () => {
    await expect(
      db.insert(users).values({ authSubject: randomUUID(), birthDateCiphertext: 'ciphertext' }),
    ).rejects.toThrow()
  })
})
