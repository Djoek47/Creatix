/**
 * Merges `checkout` tree into messages/{en,es,fr,pt}/billing.json (preserves title, cardTitle).
 * Run: node scripts/build-billing-i18n.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const msgsPath = (lc) => path.join(ROOT, 'messages', lc, 'billing.json')

const P = {}

function def(id, en, es, fr, pt) {
  P[id] = { en, es, fr, pt }
}

function setByPath(tree, dotted, value) {
  const keys = dotted.split('.')
  let o = tree
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]
    if (!o[k]) o[k] = {}
    o = o[k]
  }
  o[keys[keys.length - 1]] = value
}

function buildLocaleBranch(locale) {
  const out = {}
  for (const [id, langs] of Object.entries(P)) {
    setByPath(out, id, langs[locale])
  }
  return out
}

const TIERS_EN = [
  'Under $1k',
  '$1k – $5k',
  '$5k – $7.5k',
  '$7.5k – $10k',
  '$10k – $15k',
  '$15k – $25k',
  '$25k – $35k',
  '$35k – $45k',
  '$45k – $60k',
  '$60k – $80k',
  '$80k+',
]
const TIERS_ES = [
  'Menos de $1k',
  '$1k – $5k',
  '$5k – $7,5k',
  '$7,5k – $10k',
  '$10k – $15k',
  '$15k – $25k',
  '$25k – $35k',
  '$35k – $45k',
  '$45k – $60k',
  '$60k – $80k',
  '+$80k',
]
const TIERS_FR = [
  'Sous $1k',
  '1–5 k$',
  '5–7,5 k$',
  '7,5–10 k$',
  '10–15 k$',
  '15–25 k$',
  '25–35 k$',
  '35–45 k$',
  '45–60 k$',
  '60–80 k$',
  '+80 k$',
]
const TIERS_PT = [
  'Até $1k',
  '$1k – $5k',
  '$5k – $7,5k',
  '$7,5k – $10k',
  '$10k – $15k',
  '$15k – $25k',
  '$25k – $35k',
  '$35k – $45k',
  '$45k – $60k',
  '$60k – $80k',
  '+$80k',
]

for (let i = 0; i < TIERS_EN.length; i++) {
  def(`checkout.tierBands.${i}`, TIERS_EN[i], TIERS_ES[i], TIERS_FR[i], TIERS_PT[i])
}

def(
  'checkout.fallbackName',
  'Circe et Venus',
  'Circe et Venus',
  'Circe et Venus',
  'Circe et Venus',
)
def(
  'checkout.fallbackDescription',
  'Monthly subscription',
  'Suscripción mensual',
  'Abonnement mensuel',
  'Assinatura mensal',
)
def(
  'checkout.nameBundled',
  'Circe et Venus — Bundled (OnlyFans + Fansly) — {band}',
  'Circe et Venus — Bundled (OnlyFans + Fansly) — {band}',
  'Circe et Venus — Groupé (OnlyFans + Fansly) — {band}',
  'Circe et Venus — Bundled (OnlyFans + Fansly) — {band}',
)
def(
  'checkout.nameFocus',
  'Circe et Venus — Focus ({focus}) — {band}',
  'Circe et Venus — Focus ({focus}) — {band}',
  'Circe et Venus — Focus ({focus}) — {band}',
  'Circe et Venus — Focus ({focus}) — {band}',
)
def(
  'checkout.descriptionBundled',
  'Monthly · {band} · OnlyFans + Fansly in one workspace (Bundled)',
  'Mensual · {band} · OnlyFans + Fansly en un workspace (Bundled)',
  'Mensuel · {band} · OnlyFans + Fansly dans un espace (groupé)',
  'Mensal · {band} · OnlyFans + Fansly em um workspace (Bundled)',
)
def(
  'checkout.descriptionSingle',
  'Monthly · {band} · Full tools for {platform}',
  'Mensual · {band} · Herramientas completas para {platform}',
  'Mensuel · {band} · Outils complets pour {platform}',
  'Mensal · {band} · Ferramentas completas para {platform}',
)
def(
  'checkout.descriptionDual',
  'Monthly · {band} · Full tools for {p0} and {p1}',
  'Mensual · {band} · Herramientas completas para {p0} y {p1}',
  'Mensuel · {band} · Outils complets pour {p0} et {p1}',
  'Mensal · {band} · Ferramentas completas para {p0} e {p1}',
)
def(
  'checkout.platformJoiner',
  ' + ',
  ' + ',
  ' + ',
  ' + ',
)
def(
  'checkout.platform.onlyfans',
  'OnlyFans',
  'OnlyFans',
  'OnlyFans',
  'OnlyFans',
)
def(
  'checkout.platform.fansly',
  'Fansly',
  'Fansly',
  'Fansly',
  'Fansly',
)
def(
  'checkout.platform.manyvids',
  'Anti-piracy',
  'Antipiratería',
  'Anti-piratage',
  'Anti-pirataria',
)

for (const locale of ['en', 'es', 'fr', 'pt']) {
  const merged = JSON.parse(fs.readFileSync(msgsPath(locale), 'utf8'))
  merged.checkout = buildLocaleBranch(locale).checkout
  fs.writeFileSync(msgsPath(locale), JSON.stringify(merged, null, 2) + '\n', 'utf8')
}

console.log('Merged checkout into', ['en', 'es', 'fr', 'pt'].map((l) => `messages/${l}/billing.json`).join(', '))
