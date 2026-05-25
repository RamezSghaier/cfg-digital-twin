import { createWriteStream, existsSync, mkdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { pipeline } from 'stream/promises'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RELEASE = 'https://github.com/RamezSghaier/cfg-digital-twin/releases/download/v1.0-models'
const DEST = join(__dirname, '..', 'public', 'models')

const models = [
  'locomotiveFinale.glb',
  'RailsPath.glb',
  'terrainFinal.glb',
  'wagonFinal.glb',
  'rails_inspect.glb',
  'voie_bibloc.glb',
]

if (!existsSync(DEST)) mkdirSync(DEST, { recursive: true })

async function download(url, dest) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  await pipeline(res.body, createWriteStream(dest))
}

for (const model of models) {
  const dest = join(DEST, model)
  if (existsSync(dest) && statSync(dest).size > 1000) {
    console.log(`  skip  ${model}`)
    continue
  }
  process.stdout.write(`  fetch ${model} ...`)
  await download(`${RELEASE}/${model}`, dest)
  const mb = (statSync(dest).size / 1024 / 1024).toFixed(1)
  console.log(` ${mb} MB`)
}
console.log('All models ready.')
