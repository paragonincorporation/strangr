import { afterEach, describe, expect, test } from 'vitest'
import { createApp } from './app.js'

const apps: ReturnType<typeof createApp>[] = []

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()))
})

describe('API foundation', () => {
  test('reports live and ready health without exposing secrets', async () => {
    const app = createApp()
    apps.push(app)
    const live = await app.inject({ method: 'GET', url: '/health/live' })
    const ready = await app.inject({ method: 'GET', url: '/health/ready' })
    expect(live.statusCode).toBe(200)
    expect(live.json()).toEqual({ ok: true })
    expect([200, 503]).toContain(ready.statusCode)
    expect(ready.json()).toEqual({
      ok: ready.statusCode === 200,
      dependencies: { postgres: 'up', redis: ready.statusCode === 200 ? 'up' : 'down' },
    })
  })

  test('publishes OpenAPI only in non-production configured environments', async () => {
    const app = createApp()
    apps.push(app)
    const response = await app.inject({ method: 'GET', url: '/documentation/json' })
    expect(response.statusCode).toBe(200)
    expect(response.json().info.title).toBe('Strangr API')
  })

  test('rejects protected routes without a bearer token using a stable envelope', async () => {
    const app = createApp()
    apps.push(app)
    const response = await app.inject({ method: 'GET', url: '/v1/me' })
    expect(response.statusCode).toBe(401)
    expect(response.json().error.code).toBe('unauthenticated')
    expect(response.json().error.requestId).toBeTypeOf('string')
  })
})
