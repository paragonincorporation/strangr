import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import helmet from 'helmet'
import { createRuntimeEnvHandler } from './runtime-env.js'
import { createReportHandler } from '../moderation/report-route.js'

const publicDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public')

export function createApp({ config, sessions, reportLimiter, reportLogger }) {
  const app = express()

  app.disable('x-powered-by')
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", 'ws:', 'wss:'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        mediaSrc: ["'self'", 'blob:'],
        styleSrc: ["'self'"],
        scriptSrc: ["'self'"],
        fontSrc: ["'self'", 'data:'],
        // Safari upgrades localhost CSS/JS to HTTPS when this Helmet default is
        // present, leaving the app as unstyled raw HTML during local development.
        upgradeInsecureRequests: null,
      },
    },
    crossOriginEmbedderPolicy: false,
  }))

  app.get('/health', (_request, response) => response.json({
    ok: true,
    activeSessions: sessions.size(),
  }))
  app.get('/runtime-env.js', createRuntimeEnvHandler(config))
  app.post('/report', express.json({ limit: '4kb' }), createReportHandler({
    sessions,
    reportLimiter,
    logger: reportLogger,
  }))
  app.use(express.static(publicDirectory, {
    extensions: ['html'],
    maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
  }))
  return app
}
