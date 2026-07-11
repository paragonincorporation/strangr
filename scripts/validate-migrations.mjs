import { readdir } from 'node:fs/promises'
import path from 'node:path'

const directory = path.resolve('packages/database/migrations')
let files = []

try {
  files = (await readdir(directory)).filter((file) => file.endsWith('.sql')).sort()
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}

const invalid = files.filter((file) => !/^\d{4}_[a-z0-9_]+\.sql$/.test(file))
if (invalid.length) {
  console.error(`Invalid migration filenames: ${invalid.join(', ')}`)
  process.exit(1)
}

if (new Set(files.map((file) => file.slice(0, 4))).size !== files.length) {
  console.error('Migration sequence prefixes must be unique.')
  process.exit(1)
}

console.info(
  `Migration validation passed (${files.length} migration${files.length === 1 ? '' : 's'}).`,
)
