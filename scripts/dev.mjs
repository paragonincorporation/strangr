import { spawn, spawnSync } from 'node:child_process'
import net from 'node:net'
import 'dotenv/config'

const skipServices = process.argv.includes('--skip-services')
const ports = [
  { name: 'web', value: Number(process.env.WEB_PORT || 5173) },
  { name: 'admin', value: Number(process.env.ADMIN_PORT || 5174) },
  { name: 'api', value: Number(process.env.API_PORT || 3000) },
]

const portIsAvailable = (port) =>
  new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port })
    socket.setTimeout(500)
    socket.once('connect', () => {
      socket.destroy()
      resolve(false)
    })
    socket.once('error', (error) => {
      resolve(error.code === 'ECONNREFUSED')
    })
    socket.once('timeout', () => {
      socket.destroy()
      resolve(false)
    })
  })

const occupied = []
for (const port of ports) {
  if (!(await portIsAvailable(port.value))) occupied.push(`${port.name} (${port.value})`)
}

if (occupied.length) {
  console.error(`Cannot start Strangr; these ports are already in use: ${occupied.join(', ')}`)
  console.error('Set WEB_PORT, ADMIN_PORT, or API_PORT to unused values and retry.')
  process.exit(1)
}

if (!skipServices) {
  const docker = spawnSync('docker', ['compose', 'version'], { stdio: 'ignore' })
  if (docker.status === 0) {
    const services = spawnSync('docker', ['compose', 'up', '-d', 'postgres', 'redis'], {
      stdio: 'inherit',
    })
    if (services.status !== 0) process.exit(services.status || 1)
  } else {
    console.warn('Docker is unavailable; Postgres and Redis were not started.')
    console.warn(
      'They are defined in compose.yaml and become required when persistence lands. Starting the current dependency-free foundation.',
    )
  }
}

console.info('Strangr development services:')
console.info(`  web    http://localhost:${ports[0].value}`)
console.info(`  admin  http://localhost:${ports[1].value}`)
console.info(`  api    http://localhost:${ports[2].value}`)
console.info(`  ws     ws://localhost:${ports[2].value}/ws`)

const child = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  [
    'concurrently',
    '--kill-others-on-fail',
    '--names',
    'web,admin,api',
    '--prefix-colors',
    'magenta,cyan,green',
    'npm run dev --workspace @strangr/web',
    'npm run dev --workspace @strangr/admin',
    'npm run dev --workspace @strangr/api',
  ],
  { stdio: 'inherit', env: process.env },
)

const stop = (signal) => {
  if (!child.killed) child.kill(signal)
}

process.on('SIGINT', () => stop('SIGINT'))
process.on('SIGTERM', () => stop('SIGTERM'))
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 0)
})
