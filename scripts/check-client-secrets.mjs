import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const roots = ['apps/web/dist', 'apps/admin/dist']
const forbiddenNames = [
  'DATABASE_URL',
  'REDIS_URL',
  'BIRTH_DATE_ENCRYPTION_KEY',
  'TURN_CREDENTIAL_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
]
const forbiddenValues = forbiddenNames
  .map((name) => process.env[name])
  .filter((value) => typeof value === 'string' && value.length >= 8)

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => [])
  const files = []
  for (const entry of entries) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await collect(target)))
    else files.push(target)
  }
  return files
}

const findings = []
for (const root of roots)
  for (const file of await collect(root)) {
    const content = await readFile(file, 'utf8')
    const matched = [...forbiddenNames, ...forbiddenValues].find((value) => content.includes(value))
    if (matched)
      findings.push(`${file} (${forbiddenNames.includes(matched) ? matched : 'secret value'})`)
  }
if (findings.length) {
  console.error(`Server configuration leaked into client output: ${findings.join(', ')}`)
  process.exit(1)
}
console.info('Client output contains no server secret names or configured secret values.')
