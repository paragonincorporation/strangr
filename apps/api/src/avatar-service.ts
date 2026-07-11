import { randomUUID } from 'node:crypto'
import { and, eq, lt } from 'drizzle-orm'
import sharp from 'sharp'
import type { Database } from '@strangr/database'
import { avatarUploads, profiles } from '@strangr/database'
import { DomainError } from './account-service.js'

export interface ObjectStorage {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>
  get(key: string): Promise<Uint8Array>
  delete(key: string): Promise<void>
  signedUrl(key: string, expiresSeconds: number): Promise<string>
}
export class SupabaseStorage implements ObjectStorage {
  constructor(
    private baseUrl: string,
    private bucket: string,
    private serviceKey: string,
  ) {}
  private headers(type?: string) {
    return {
      authorization: `Bearer ${this.serviceKey}`,
      apikey: this.serviceKey,
      ...(type ? { 'content-type': type } : {}),
    }
  }
  async put(key: string, body: Uint8Array, type: string) {
    const r = await fetch(`${this.baseUrl}/storage/v1/object/${this.bucket}/${key}`, {
      method: 'POST',
      headers: { ...this.headers(type), 'x-upsert': 'true' },
      body: Buffer.from(body),
    })
    if (!r.ok) throw new Error('Storage write failed')
  }
  async get(key: string) {
    const r = await fetch(`${this.baseUrl}/storage/v1/object/authenticated/${this.bucket}/${key}`, {
      headers: this.headers(),
    })
    if (!r.ok) throw new Error('Storage read failed')
    return new Uint8Array(await r.arrayBuffer())
  }
  async delete(key: string) {
    await fetch(`${this.baseUrl}/storage/v1/object/${this.bucket}/${key}`, {
      method: 'DELETE',
      headers: this.headers(),
    })
  }
  async signedUrl(key: string, expiresSeconds: number) {
    const r = await fetch(`${this.baseUrl}/storage/v1/object/sign/${this.bucket}/${key}`, {
      method: 'POST',
      headers: { ...this.headers('application/json') },
      body: JSON.stringify({ expiresIn: expiresSeconds }),
    })
    if (!r.ok) throw new Error('Storage signing failed')
    const data = (await r.json()) as { signedURL: string }
    return `${this.baseUrl}/storage/v1${data.signedURL}`
  }
}
export class AvatarService {
  constructor(
    private db: Database,
    private storage: ObjectStorage,
  ) {}
  async init(userId: string, contentType: string, byteSize: number) {
    const id = randomUUID(),
      key = `quarantine/${userId}/${id}`
    const expiresAt = new Date(Date.now() + 15 * 60_000)
    await this.db.insert(avatarUploads).values({
      id,
      userId,
      declaredContentType: contentType,
      declaredByteSize: byteSize,
      quarantineObjectKey: key,
      expiresAt,
    })
    return {
      uploadId: id,
      uploadUrl: `/v1/me/avatar-uploads/${id}/content`,
      expiresAt: expiresAt.toISOString(),
    }
  }
  async upload(userId: string, id: string, body: Uint8Array, contentType: string) {
    const upload = await this.owned(userId, id)
    if (upload.state !== 'pending' || upload.expiresAt.getTime() < Date.now())
      throw new DomainError('conflict', 'Upload is unavailable', 409)
    if (contentType !== upload.declaredContentType || body.byteLength !== upload.declaredByteSize)
      throw new DomainError('bad_request', 'Upload metadata does not match', 400)
    await this.storage.put(upload.quarantineObjectKey, body, contentType)
  }
  async finalize(userId: string, id: string) {
    const upload = await this.owned(userId, id)
    if (upload.state !== 'pending' || upload.expiresAt.getTime() < Date.now())
      throw new DomainError('conflict', 'Upload is unavailable', 409)
    await this.db
      .update(avatarUploads)
      .set({ state: 'processing', updatedAt: new Date() })
      .where(eq(avatarUploads.id, id))
    try {
      const raw = await this.storage.get(upload.quarantineObjectKey)
      const image = sharp(raw, { animated: false, limitInputPixels: 20_000_000, failOn: 'warning' })
      const metadata = await image.metadata()
      if (
        !['jpeg', 'png', 'webp'].includes(metadata.format ?? '') ||
        (metadata.pages ?? 1) > 1 ||
        !metadata.width ||
        !metadata.height ||
        metadata.width > 4096 ||
        metadata.height > 4096
      )
        throw new Error('unsafe_image')
      const processed = await image
        .rotate()
        .resize(512, 512, { fit: 'cover' })
        .webp({ quality: 85 })
        .toBuffer()
      const key = `processed/${userId}/${randomUUID()}.webp`
      await this.storage.put(key, processed, 'image/webp')
      await this.db.transaction(async (tx) => {
        const [old] = await tx
          .select({ key: profiles.avatarObjectKey })
          .from(profiles)
          .where(eq(profiles.userId, userId))
        await tx
          .update(profiles)
          .set({ avatarObjectKey: key, updatedAt: new Date() })
          .where(eq(profiles.userId, userId))
        await tx
          .update(avatarUploads)
          .set({
            state: 'ready',
            processedObjectKey: key,
            finalizedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(avatarUploads.id, id))
        if (old?.key && old.key !== key) await this.storage.delete(old.key)
      })
      await this.storage.delete(upload.quarantineObjectKey)
      return { avatarUrl: await this.storage.signedUrl(key, 300) }
    } catch {
      await this.db
        .update(avatarUploads)
        .set({ state: 'failed', failureCode: 'invalid_image', updatedAt: new Date() })
        .where(eq(avatarUploads.id, id))
      await this.storage.delete(upload.quarantineObjectKey)
      throw new DomainError('bad_request', 'Image could not be safely processed', 400)
    }
  }
  async signedAvatar(userId: string) {
    const [p] = await this.db.select().from(profiles).where(eq(profiles.userId, userId))
    if (!p?.avatarObjectKey) throw new DomainError('not_found', 'Avatar not found', 404)
    return this.storage.signedUrl(p.avatarObjectKey, 300)
  }
  async cleanup(now = new Date()) {
    const rows = await this.db
      .select()
      .from(avatarUploads)
      .where(and(eq(avatarUploads.state, 'pending'), lt(avatarUploads.expiresAt, now)))
    for (const row of rows) {
      await this.storage.delete(row.quarantineObjectKey)
      await this.db
        .update(avatarUploads)
        .set({ state: 'abandoned', updatedAt: now })
        .where(eq(avatarUploads.id, row.id))
    }
    return rows.length
  }
  private async owned(userId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(avatarUploads)
      .where(and(eq(avatarUploads.id, id), eq(avatarUploads.userId, userId)))
    if (!row) throw new DomainError('not_found', 'Upload not found', 404)
    return row
  }
}
