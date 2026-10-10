// Writes backend/data/career_guide.json from the web Career Guide data so the iOS app shows the
// same tracks and firms. Run after editing src/components/career/careerMeta.js or firms.js:
//   node frontend/tools/gen_career_json.mjs
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { META, TRACK_FIRMS } from '../src/components/career/careerMeta.js'
import { CATEGORIES, FIRMS } from '../src/components/career/firms.js'

const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, '..', '..', 'backend', 'data', 'career_guide.json')
writeFileSync(out, JSON.stringify({ meta: META, trackFirms: TRACK_FIRMS, categories: CATEGORIES, firms: FIRMS }, null, 1) + '\n')
console.log(`wrote ${out}: ${Object.keys(META).length} tracks, ${FIRMS.length} firms`)
