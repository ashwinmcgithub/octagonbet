/**
 * Fetches real fighter headshot URLs using:
 *  1. Wikipedia pageimages API (free, no key)
 *  2. DuckDuckGo Instant Answer API (free, no key) for anyone missed
 *  3. ESPN CDN as secondary fallback
 *  4. ui-avatars initials as last resort
 *
 * Run with: npx tsx scripts/fetch-fighter-images.ts
 */

import * as fs from 'fs'
import * as path from 'path'

// ── Fighter roster ────────────────────────────────────────────────────────────
const FIGHTERS = [
  'Jon Jones', 'Stipe Miocic',
  'Kevin Vallejos', 'Josh Emmett',
  'Gillian Robertson', 'Amanda Lemos',
  'Oumar Sy', 'Ion Cutelaba',
  'Jose Delgado', 'Andre Fili',
  'Marwan Rahiki', 'Harry Hardwick',
  'Vitor Petrino', 'Steven Asplund',
  'Brad Tavares', 'Eryk Anders',
  'Charles Johnson', 'Bruno Silva',
  'Hecher Sosa', 'Luan Lacerda',
  'Bia Mesquita', 'Montserrat Rendon',
  'Myktybek Orolbai', 'Chris Curtis',
  'Manoel Sousa', 'Bolaji Oki',
  'Elijah Smith', 'SuYoung You',
  'Piera Rodriguez', 'Sam Hughes',
]

// Use an explicit Wikipedia article title when the fighter's name alone is ambiguous
const WIKI_OVERRIDE: Record<string, string> = {
  'Jon Jones':    'Jon Jones',           // direct — no "(fighter)" suffix needed
  'Bruno Silva':  'Bruno Silva (fighter)',
  'Sam Hughes':   'Sam Hughes (fighter)',
  'SuYoung You':  'Soo Young You',
  'Chris Curtis': 'Chris Curtis (fighter)',
}

// Known ESPN athlete IDs (secondary fallback)
const ESPN_IDS: Record<string, number> = {
  'Jon Jones': 2335639, 'Stipe Miocic': 2504951,
  'Kevin Vallejos': 5145681, 'Josh Emmett': 4011299,
  'Gillian Robertson': 4089026, 'Amanda Lemos': 4233196,
  'Oumar Sy': 5074120, 'Andre Fili': 3074464,
  'Vitor Petrino': 5060483, 'Brad Tavares': 2504643,
  'Eryk Anders': 4082125, 'Charles Johnson': 4375156,
  'Bruno Silva': 3895544, 'Bia Mesquita': 5310274,
  'Chris Curtis': 2984770, 'Elijah Smith': 5144797,
  'Sam Hughes': 4348673, 'Piera Rodriguez': 4816066,
}

const HEADERS = { 'User-Agent': 'ApexWager/1.0 (fighter-image-fetcher; hobby project)' }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ── Strategy 1: Wikipedia pageimages API ─────────────────────────────────────
async function wikiImage(title: string): Promise<string | null> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&pithumbsize=400&format=json&origin=*`
  try {
    const res = await fetch(url, { headers: HEADERS })
    const data = await res.json() as any
    const pages = data?.query?.pages ?? {}
    const page = Object.values(pages)[0] as any
    if (page?.pageid === -1) return null           // page not found
    const src: string | undefined = page?.thumbnail?.source
    if (!src) return null
    return src.replace(/\/\d+px-/, '/400px-')
  } catch { return null }
}

// ── Strategy 2: Wikipedia search then get image of top result ─────────────────
async function wikiSearchImage(query: string): Promise<string | null> {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query + ' MMA fighter UFC')}&srlimit=5&format=json&origin=*`
    const sRes = await fetch(searchUrl, { headers: HEADERS })
    const sData = await sRes.json() as any
    const results = sData?.query?.search as any[] ?? []

    for (const result of results) {
      const title: string = result.title
      // Skip obviously wrong results (disambiguation pages, historical people)
      if (title.includes('disambig') || /^\d{4}/.test(title)) continue
      const img = await wikiImage(title)
      if (img) return img
      await sleep(150)
    }
  } catch {}
  return null
}

// ── Strategy 3: DuckDuckGo Instant Answer API ─────────────────────────────────
async function ddgImage(fighter: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(`${fighter} UFC MMA fighter`)
    const url = `https://api.duckduckgo.com/?q=${q}&format=json&no_html=1&skip_disambig=1`
    const res = await fetch(url, { headers: HEADERS })
    const data = await res.json() as any
    if (data?.Image && data.Image.startsWith('http')) return data.Image
    // Try RelatedTopics
    const related = data?.RelatedTopics as any[] ?? []
    for (const t of related) {
      if (t?.Icon?.URL?.startsWith('http')) return t.Icon.URL
    }
  } catch {}
  return null
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Fetching fighter images (Wikipedia → DDG search → ESPN → avatar)…\n')

  const imageMap: Record<string, string> = {}

  for (const fighter of FIGHTERS) {
    process.stdout.write(`  ${fighter}… `)

    let img: string | null = null
    let source = ''

    // 1. Wikipedia — exact title (with override if needed)
    const wikiTitle = WIKI_OVERRIDE[fighter] ?? fighter
    img = await wikiImage(wikiTitle)
    if (img) { source = 'Wikipedia (direct)' }

    // 2. Wikipedia — search fallback
    if (!img) {
      await sleep(200)
      img = await wikiSearchImage(fighter)
      if (img) { source = 'Wikipedia (search)' }
    }

    // 3. DuckDuckGo Instant Answer
    if (!img) {
      await sleep(200)
      img = await ddgImage(fighter)
      if (img) { source = 'DuckDuckGo' }
    }

    // 4. ESPN CDN
    if (!img) {
      const espnId = ESPN_IDS[fighter]
      if (espnId) {
        img = `https://a.espncdn.com/i/headshots/mma/players/full/${espnId}.png`
        source = 'ESPN CDN'
      }
    }

    // 5. ui-avatars last resort
    if (!img) {
      img = `https://ui-avatars.com/api/?name=${encodeURIComponent(fighter)}&background=dc2626&color=ffffff&size=256&bold=true&format=png`
      source = 'avatar (no photo found)'
    }

    imageMap[fighter] = img!
    console.log(`✓ [${source}]`)
    await sleep(300)
  }

  // ── Generate the TypeScript source file ──────────────────────────────────
  const ts = `// Auto-generated by scripts/fetch-fighter-images.ts — do not edit manually
// Sources: Wikipedia, ESPN CDN, ui-avatars

const FIGHTER_IMAGE_MAP: Record<string, string> = {
${FIGHTERS.map((f) => `  ${JSON.stringify(f)}: ${JSON.stringify(imageMap[f])},`).join('\n')}
}

export function getFighterImageUrl(fighterName: string): string {
  const url = FIGHTER_IMAGE_MAP[fighterName]
  if (url) return url
  return \`https://ui-avatars.com/api/?name=\${encodeURIComponent(fighterName)}&background=dc2626&color=ffffff&size=256&bold=true&format=png\`
}

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map((w) => w[0]?.toUpperCase() ?? '').join('').slice(0, 2) || '??'
}

export function getFighterFallbackDataUri(fighterName: string): string {
  const initials = getInitials(fighterName)
  const svg = \`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'>
    <defs>
      <linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'>
        <stop offset='0%' stop-color='#1a0000'/>
        <stop offset='100%' stop-color='#2d0a0a'/>
      </linearGradient>
    </defs>
    <rect width='256' height='256' fill='url(#g)'/>
    <circle cx='128' cy='88' r='50' fill='#dc2626' opacity='0.18'/>
    <circle cx='128' cy='88' r='38' fill='#dc2626' opacity='0.28'/>
    <text x='128' y='102' text-anchor='middle' fill='#ffffff' font-size='40'
      font-family='Arial Black, Arial, sans-serif' font-weight='900'>\${initials}</text>
    <rect x='48' y='152' width='160' height='72' rx='36' fill='#dc2626' opacity='0.14'/>
  </svg>\`
  return \`data:image/svg+xml;utf8,\${encodeURIComponent(svg)}\`
}
`

  const outPath = path.join(process.cwd(), 'src/lib/fighter-images.ts')
  fs.writeFileSync(outPath, ts, 'utf8')

  const realPhotos = FIGHTERS.filter((f) => !imageMap[f].includes('ui-avatars')).length
  console.log(`\n✅ ${realPhotos}/${FIGHTERS.length} fighters have real photos`)
  console.log(`📝 Updated: src/lib/fighter-images.ts`)
}

main().catch(console.error)
