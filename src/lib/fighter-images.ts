// Fighter image sources — only verified correct photos
// Sources: Wikipedia (exact article match) · ESPN CDN (verified athlete IDs)

const ESPN = 'https://a.espncdn.com/i/headshots/mma/players/full'
const WP   = 'https://upload.wikimedia.org/wikipedia/commons'

const FIGHTER_IMAGE_MAP: Record<string, string> = {

  // ── Wikipedia — confirmed direct article matches ──────────────────────────
  'Jon Jones':
    `${WP}/thumb/4/43/Jon_Jones_-_Supporting_Brain_Health_Study.jpg/400px-Jon_Jones_-_Supporting_Brain_Health_Study.jpg`,
  'Stipe Miocic':
    `${WP}/thumb/2/2c/Stipe_Miocic_%2848086643396%29_%28cropped%29.jpg/400px-Stipe_Miocic_%2848086643396%29_%28cropped%29.jpg`,
  'Josh Emmett':
    `${WP}/2/25/Josh_Emmett.png`,
  'Gillian Robertson':
    `${WP}/1/1a/Gillian_Robertson.png`,
  'Brad Tavares':
    `${WP}/thumb/a/aa/Brad_Tavares_at_UFC_244.jpg/400px-Brad_Tavares_at_UFC_244.jpg`,
  'Eryk Anders':
    `${WP}/thumb/6/69/UFC_fighter_Eryk_Anders_trains_with_NAVROTA_Airmen_during_Warrior_Heart_Day_%281%29_%28cropped%29.jpg/400px-UFC_fighter_Eryk_Anders_trains_with_NAVROTA_Airmen_during_Warrior_Heart_Day_%281%29_%28cropped%29.jpg`,

  // ── ESPN CDN — Main Card ──────────────────────────────────────────────────
  'Kevin Vallejos':  `${ESPN}/5145681.png`,   // id from espn.com/mma/fighter/_/id/5145681
  'Amanda Lemos':    `${ESPN}/4233196.png`,   // id/4233196
  'Oumar Sy':        `${ESPN}/5074120.png`,   // id/5074120
  'Ion Cutelaba':    `${ESPN}/3994033.png`,   // id/3994033
  'Jose Delgado':    `${ESPN}/5223435.png`,   // id/5223435 (Jose Miguel Delgado)
  'Andre Fili':      `${ESPN}/3074464.png`,   // id/3074464
  'Marwan Rahiki':   `${ESPN}/5302274.png`,   // id/5302274
  'Harry Hardwick':  `${ESPN}/4396363.png`,   // id/4396363
  'Vitor Petrino':   `${ESPN}/5060483.png`,   // id/5060483
  'Steven Asplund':  `${ESPN}/5239615.png`,   // id/5239615

  // ── ESPN CDN — Prelims ───────────────────────────────────────────────────
  'Charles Johnson':   `${ESPN}/4375156.png`, // id/4375156
  'Bruno Silva':       `${ESPN}/3895544.png`, // id/3895544
  'Hecher Sosa':       `${ESPN}/5236383.png`, // id/5236383
  'Luan Lacerda':      `${ESPN}/4410005.png`, // id/4410005
  'Bia Mesquita':      `${ESPN}/5310274.png`, // id/5310274
  'Montserrat Rendon': `${ESPN}/5093484.png`, // id/5093484
  'Myktybek Orolbai':  `${ESPN}/5050129.png`, // id/5050129
  'Chris Curtis':      `${ESPN}/2984770.png`, // id/2984770
  'Manoel Sousa':      `${ESPN}/5085291.png`, // id/5085291
  'Bolaji Oki':        `${ESPN}/5145682.png`, // id/5145682
  'Elijah Smith':      `${ESPN}/5144797.png`, // id/5144797
  'Piera Rodriguez':   `${ESPN}/4816066.png`, // id/4816066
  'Sam Hughes':        `${ESPN}/4348673.png`, // id/4348673

  // SuYoung You — no ESPN/Wikipedia photo found; branded avatar used (fallback)
}

export function getFighterImageUrl(fighterName: string): string {
  const url = FIGHTER_IMAGE_MAP[fighterName]
  if (url) return url
  // Red branded avatar — looks intentional, never shows a wrong face
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(fighterName)}&background=dc2626&color=ffffff&size=256&bold=true&format=png`
}

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map((w) => w[0]?.toUpperCase() ?? '').join('').slice(0, 2) || '??'
}

// Used only when a network image fails to load (onerror)
export function getFighterFallbackDataUri(fighterName: string): string {
  const initials = getInitials(fighterName)
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'>
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
      font-family='Arial Black, Arial, sans-serif' font-weight='900'>${initials}</text>
    <rect x='48' y='152' width='160' height='72' rx='36' fill='#dc2626' opacity='0.14'/>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
