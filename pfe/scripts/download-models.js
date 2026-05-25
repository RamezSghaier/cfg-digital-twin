const https = require('https')
const fs = require('fs')
const path = require('path')

const RELEASE = 'https://github.com/RamezSghaier/cfg-digital-twin/releases/download/v1.0-models'
const DEST = path.join(__dirname, '..', 'public', 'models')

const models = [
  'locomotiveFinale.glb',
  'RailsPath.glb',
  'terrainFinal.glb',
  'wagonFinal.glb',
  'rails_inspect.glb',
  'voie_bibloc.glb',
]

if (!fs.existsSync(DEST)) fs.mkdirSync(DEST, { recursive: true })

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    function get(u) {
      https.get(u, res => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return get(res.headers.location)
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for ${u}`))
        }
        res.pipe(file)
        file.on('finish', () => { file.close(); resolve() })
      }).on('error', reject)
    }
    get(url)
  })
}

async function main() {
  for (const model of models) {
    const dest = path.join(DEST, model)
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
      console.log(`  skip  ${model} (already present)`)
      continue
    }
    process.stdout.write(`  fetch ${model} ...`)
    await download(`${RELEASE}/${model}`, dest)
    const mb = (fs.statSync(dest).size / 1024 / 1024).toFixed(1)
    console.log(` ${mb} MB`)
  }
  console.log('All models ready.')
}

main().catch(e => { console.error(e); process.exit(1) })
