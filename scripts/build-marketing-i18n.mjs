/**
 * Merges `pricingCalculator` tree into messages/{en,es,fr,pt}/marketing.json
 * Run: node scripts/build-marketing-i18n.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const msgsPath = (lc) => path.join(ROOT, 'messages', lc, 'marketing.json')

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
  def(`pricingCalculator.tierBands.${i}`, TIERS_EN[i], TIERS_ES[i], TIERS_FR[i], TIERS_PT[i])
}

def(
  'pricingCalculator.tierNumberFallback',
  'tier {tier}',
  'nivel {tier}',
  'niveau {tier}',
  'nível {tier}',
)

def(
  'pricingCalculator.landingAria',
  'Pricing estimate',
  'Estimación de precios',
  'Estimation tarifaire',
  'Estimativa de preço',
)
def(
  'pricingCalculator.landingEyebrow',
  'Your plan',
  'Tu plan',
  'Votre formule',
  'Seu plano',
)

def(
  'pricingCalculator.settingsEyebrow',
  'Estimate',
  'Estimación',
  'Estimation',
  'Estimativa',
)
def(
  'pricingCalculator.settingsEstimateTitle',
  'Same math as checkout',
  'Misma lógica que el checkout',
  'Même logique que le paiement',
  'Mesma lógica do checkout',
)
def(
  'pricingCalculator.settingsEstimateSubtitle',
  'Revenue band, plan shape, and platforms match Stripe before taxes or discounts.',
  'La banda, la forma del plan y las plataformas coinciden con Stripe antes de impuestos o descuentos.',
  'Bande, formule et plateformes alignées sur Stripe avant taxes ou remises.',
  'Faixa, formato do plano e plataformas batem com o Stripe antes de impostos ou descontos.',
)

def(
  'pricingCalculator.defaultEyebrow',
  'Pricing',
  'Precios',
  'Tarifs',
  'Preços',
)
def(
  'pricingCalculator.defaultHeading',
  "What you'll pay",
  'Qué pagarías',
  'Ce que vous payez',
  'O que você paga',
)
def(
  'pricingCalculator.defaultSubtitle',
  'Choose your revenue band, plan shape, and platforms. Figures match Stripe checkout before discounts or taxes.',
  'Elige tu banda, la forma del plan y las plataformas. Los importes igualan Stripe antes de descuentos o impuestos.',
  'Choisissez votre tranche, la formule et les plateformes. Montants alignés sur Stripe avant remises ou taxes.',
  'Escolha a faixa de receita, o formato do plano e as plataformas. Os valores iguais ao Stripe antes de descontos ou impostos.',
)

def(
  'pricingCalculator.revenueBand',
  'Revenue band',
  'Banda de ingresos',
  'Tranche de revenus',
  'Faixa de receita',
)
def(
  'pricingCalculator.emDashPlaceholder',
  '—',
  '—',
  '—',
  '—',
)

def(
  'pricingCalculator.linkedBadge',
  'Linked',
  'Enlazado',
  'Lié',
  'Vinculado',
)

def(
  'pricingCalculator.revenue.helpLockedP1',
  'Synced from combined OnlyFans / Fansly month-to-date totals—the same ladder as checkout after your subscribed band is updated.',
  'Sincronizado con los totales combinados mes a la fecha en OnlyFans / Fansly: la misma escala que en checkout tras actualizar tu banda.',
  'Aligné sur le cumul mois‑à‑jour OnlyFans / Fansly — même échelle qu’après mise à jour de votre tranche souscrite.',
  'Sincronizado com MTD combinado OnlyFans / Fansly — mesma escada do checkout depois da faixa atualizar.',
)

def(
  'pricingCalculator.revenue.helpLockedP2',
  'Bands below {band} stay visible but cannot be selected while integrations stay linked.',
  'Las bandas por debajo de {band} se ven pero no se pueden elegir con integraciones vinculadas.',
  'Les tranches sous {band} restent visibles mais ne sont pas sélectionnables tant que les intégrations sont liées.',
  'Faixas abaixo de {band} ficam visíveis, mas não dá para selecionar enquanto as integrações estiverem vinculadas.',
)

def(
  'pricingCalculator.revenue.updated',
  'Updated {when}.',
  'Actualizado {when}.',
  'Mis à jour {when}.',
  'Atualizado {when}.',
)

def(
  'pricingCalculator.revenue.helpLockedP3',
  'Disconnect integrations to pick a revenue band manually.',
  'Desconecta integraciones para elegir una banda a mano.',
  'Déconnectez une intégration pour choisir une tranche manuellement.',
  'Desconecte integrações para escolher a faixa manualmente.',
)

def(
  'pricingCalculator.revenue.helpPartialLinkedP1',
  'Band estimate uses combined linked earnings (OnlyFans + Fansly). Every tier stays visible; bands below {band} are disabled until you disconnect an integration—the same ladder enforced at checkout.',
  'La estimación usa ingresos enlazados combinados (OnlyFans + Fansly). Todos los niveles se muestran; las bandas bajo {band} están desactivadas hasta desconectar una integración—misma regla que en checkout.',
  'Estimation sur le cumul lié OnlyFans + Fansly; toutes les tranches sont visibles, celles sous {band} restent bloquées tant qu’une intégration est liée.',
  'A estimativa usa receita combinada vinculada (OnlyFans + Fansly); todas as faixas aparecem; abaixo de {band} ficam bloqueadas até desconectar — mesma regra do checkout.',
)

def(
  'pricingCalculator.revenue.helpSettingsSimple',
  'Tier mirrors gross monthly billings at checkout.',
  'El nivel refleja la facturación bruta mensual del checkout.',
  'Le niveau reflète votre facturation mensuelle brute au checkout.',
  'O nível espelha o faturamento bruto mensal do checkout.',
)

def(
  'pricingCalculator.revenue.helpMarketingSimple',
  'Same tiers as checkout. Pick the interval that matches your gross monthly billings.',
  'Los mismos escalones que en checkout. Elige el tramo que encaje con tus ingresos brutos mensuales.',
  'Même échelle qu’au checkout. Choisissez la borne qui correspond au brut mensuel.',
  'Mesmos degraus do checkout. Escolha o intervalo que combina com o faturamento bruto mensal.',
)

def(
  'pricingCalculator.revenue.linkedMtdLead',
  'Linked MTD estimate (combined):',
  'Estimación MTD vinculada (combinado):',
  'Estimation MTD liée (combinée):',
  'Estimativa MTD vinculada (combinada):',
)

def(
  'pricingCalculator.revenue.onlyFansLabel',
  'OnlyFans {amount}',
  'OnlyFans {amount}',
  'OnlyFans {amount}',
  'OnlyFans {amount}',
)

def(
  'pricingCalculator.revenue.fanslyLabel',
  'Fansly {amount}',
  'Fansly {amount}',
  'Fansly {amount}',
  'Fansly {amount}',
)

def(
  'pricingCalculator.revenue.subscribedBelowFloor',
  'Your subscribed band sits below earnings implied by linked accounts. Finish checkout for the band you select above—the next Stripe invoice reflects the upgrade.',
  'Tu banda suscrita está por debajo de los ingresos que sugieren cuentas vinculadas. Completa el checkout con la banda elegida aquí — la siguiente factura de Stripe refleja el aumento.',
  'Votre tranche souscrite est sous le niveau suggéré par les comptes liés. Finalisez le paiement pour la tranche choisie — la prochaine facture reflète la montée.',
  'Sua faixa atual fica abaixo do que as contas sugerem. Finalize checkout com a faixa escolhida — a próxima fatura reflete upgrade.',
)

def(
  'pricingCalculator.revenue.bandPreviewCycling',
  'Cycling bands as a preview—open the menu or switch to revenue estimate to hold still.',
  'Las bandas rotan solo como vista previa — abre el menú o usa estimación manual para frenar.',
  'Les bandes défilent pour la démo — ouvrir le menu ou passer au saisi manuelle pour figer.',
  'As faixas giram só como prévia — abra o menu ou use receita digitada para parar.',
)

def(
  'pricingCalculator.revenue.overrideLabel',
  'Enter monthly revenue instead',
  'Introduce ingreso mensual a mano',
  'Saisir le CA mensuel',
  'Informe a receita mensal manualmente',
)
def(
  'pricingCalculator.revenue.overrideHint',
  "Use when integrations are not linked yet—still matches tier ladders at checkout.",
  'Para cuando las integraciones aún no están vinculadas; sigue la misma escala que en checkout.',
  "Quand aucune intégration liée : toutefois même échelle qu’au checkout.",
  'Quando não há integrações vinculadas — mesma escada do checkout.',
)

def(
  'pricingCalculator.revenue.grossMonthlyUsdLabel',
  'Gross monthly revenue (USD)',
  'Ingreso bruto mensual (USD)',
  'CA mensuel brut (USD)',
  'Receita bruta mensal (USD)',
)

def(
  'pricingCalculator.revenue.placeholderExample',
  'e.g. 5000',
  'p. ej. 5000',
  'ex. 5000',
  'ex. 5000',
)

def(
  'pricingCalculator.revenue.mapsToSettings',
  'Maps to {band}.',
  'Equivale a {band}.',
  'Correspond à {band}.',
  ' Equivale a {band}.',
)

def(
  'pricingCalculator.revenue.mapsToMarketing',
  'Maps to {band}, same as billing.',
  'Equivale a {band}, igual que en cobros.',
  'Correspond à {band}, comme en facturation.',
  'Igual que em cobrança: {band}.',
)

def(
  'pricingCalculator.revenue.requiresMinTier',
  'Linked accounts require at least {band}; the preview uses that minimum so totals match checkout.',
  'Las cuentas vinculadas exigen al menos {band}; la vista previa usa ese mínimo como en checkout.',
  'Les comptes liés demandent au moins {band} ; prévisualisation clampée comme au checkout.',
  'Contas vinculadas exigem pelo menos {band}; a prévia usa esse mínimo como no checkout.',
)

def(
  'pricingCalculator.planHeading',
  'Plan',
  'Plan',
  'Formule',
  'Plano',
)
def(
  'pricingCalculator.singlePlatform',
  'Single platform',
  'Una plataforma',
  'Une plateforme',
  'Uma plataforma',
)
def(
  'pricingCalculator.bundled',
  'Bundled',
  'Bundled',
  'Groupé',
  'Bundled',
)

def(
  'pricingCalculator.platformsHeading',
  'Platforms',
  'Plataformas',
  'Plateformes',
  'Plataformas',
)

def(
  'pricingCalculator.focusPlatform.onlyfans',
  'OnlyFans',
  'OnlyFans',
  'OnlyFans',
  'OnlyFans',
)
def(
  'pricingCalculator.focusPlatform.fansly',
  'Fansly',
  'Fansly',
  'Fansly',
  'Fansly',
)
def(
  'pricingCalculator.focusPlatform.antipiracyFocus',
  'Anti-piracy',
  'Antipiratería',
  'Anti‑piratage',
  'Anti‑pirataria',
)

def(
  'pricingCalculator.pairFocus.ofFansly',
  'OnlyFans + Fansly: OnlyFans base + {addon}/mo (bundle)',
  'OnlyFans + Fansly: base OnlyFans + {addon}/mes (paquetizado)',
  'OnlyFans + Fansly : base OnlyFans + {addon}/mois (offre duo)',
  'OnlyFans + Fansly: base OnlyFans + {addon}/mês (pacote)',
)
def(
  'pricingCalculator.pairFocus.ofMv',
  'OnlyFans + ManyVids: OnlyFans base + {addon}/mo (bundle)',
  'OnlyFans + ManyVids: base OnlyFans + {addon}/mes (paquetizado)',
  'OnlyFans + ManyVids : base OnlyFans + {addon}/mois (offre duo)',
  'OnlyFans + ManyVids: base OnlyFans + {addon}/mês (pacote)',
)
def(
  'pricingCalculator.pairFocus.flMv',
  'Fansly + ManyVids: Fansly line + {addon}/mo (bundle)',
  'Fansly + ManyVids: línea Fansly + {addon}/mes (paquetizado)',
  'Fansly + ManyVids : ligne Fansly + {addon}/mois',
  'Fansly + ManyVids: linha Fansly + {addon}/mês',
)

def(
  'pricingCalculator.singlePlatformCombined',
  'Single platform ({pair})',
  'Una plataforma ({pair})',
  'Une plateforme ({pair})',
  'Plataforma única ({pair})',
)

def(
  'pricingCalculator.noteSinglePlatform',
  'Single platform',
  'Una plataforma',
  'Une plateforme',
  'Uma plataforma',
)

def(
  'pricingCalculator.pairJoiner',
  ' + ',
  ' + ',
  ' + ',
  ' + ',
)

def(
  'pricingCalculator.breakdown.multiplatformProtection',
  'Multiplatform protection',
  'Protección multipataforma',
  'Protection multi‑plateforme',
  'Proteção multiplataforma',
)
def(
  'pricingCalculator.breakdown.protectionOnlyLead',
  'Standalone plan for leak alerts and DMCA-style coverage on extra fan and clip storefronts.',
  'Plan solo para fugas de contenido y cobertura estilo DMCA en vitrinas extra.',
  'Offre solo pour fuites et retraits type DMCA sur vitrines supplémentaires.',
  'Plano avulso para alertas de vazamento e cobertura estilo DMCA em vitrinas extras.',
)

def(
  'pricingCalculator.breakdown.bundledOfFl',
  'Bundled (OnlyFans + Fansly)',
  'Bundled (OnlyFans + Fansly)',
  'Groupé (OnlyFans + Fansly)',
  'Bundled (OnlyFans + Fansly)',
)

def(
  'pricingCalculator.breakdown.antiPiracyCreditsAllocated',
  '{credits} credits · Anti‑Piracy storefront',
  '{credits} créditos · vitrina Anti‑Piracy',
  '{credits} crédits · vitrine Anti‑Piracy',
  '{credits} créditos · vitrine Anti‑Piracy',
)

def(
  'pricingCalculator.breakdown.antiPiracyFee',
  'Anti‑Piracy',
  'Anti‑Piracy',
  'Anti‑Piracy',
  'Anti‑Piracy',
)

def(
  'pricingCalculator.breakdown.noteBundledSoonSettings',
  'One Bundled bill. Anti‑Piracy is the ManyVids storefront connector ({credits, number} credits allocated per cycle above). Standalone Multiplatform Protection is coming soon.',
  'Una factura Bundled. Anti‑Piracy es el conector ManyVids ({credits, number} créditos por ciclo arriba). La Protection multipataforma autónoma llegará pronto.',
  'Une facture groupée. Anti‑Piracy connecte ManyVids ({credits, number} crédits par cycle ci‑dessus). Protection autonome bientôt.',
  'Uma fatura Bundled. Anti‑Piracy é o conector ManyVids ({credits, number} créditos/ciclo acima). Protection autônomo multiplataforma em breve.',
)

def(
  'pricingCalculator.breakdown.noteBundledSoonMarketing',
  'Bundled workspace for OnlyFans and Fansly. Anti‑Piracy adds ManyVids and the connector line item. Standalone Protection for extra storefronts is coming soon.',
  'Workspace Bundled OnlyFans + Fansly. Anti‑Piracy añade ManyVids y la línea conectora. Protection autónomo para más vitrinas, próximamente.',
  'Espace Bundled OF+Fansly ; Anti‑Piracy ajoute ManyVids. Protection solo plus tard.',
  'Workspace bundled OF+Fansly; Anti‑Piracy acrescenta ManyVids e a linha. Protection próprio para extra, em breve.',
)

def(
  'pricingCalculator.breakdown.noteBundledLiveSettings',
  'One Bundled bill. Anti‑Piracy is the ManyVids storefront connector ({credits, number} credits allocated per cycle above). Multiplatform Protection is billed separately.',
  'Una sola factura Bundled. Anti‑Piracy es el conector ManyVids ({credits, number} créditos por ciclo arriba). Multiplatform Protection se factura aparte.',
  'Une facture groupée avec connecteur ManyVids ({credits, number} crédits ci‑desus). Protection multi‑plateforme facturée à part.',
  'Fatura única bundled; Anti‑Piracy = conector ManyVids ({credits, number}/ciclo); Protection cobrado aparte.',
)

def(
  'pricingCalculator.breakdown.noteBundledLiveMarketing',
  'Bundled workspace for OnlyFans and Fansly. Anti‑Piracy adds ManyVids and the connector line item; Protection for extra storefronts is on the pricing page.',
  'Bundled OnlyFans + Fansly. Anti‑Piracy suma ManyVids y línea de conector; Protection extra está en precios públicos.',
  'Bundled OF+Fansly avec ManyVids ; Protection extra sur la page tarifs.',
  'Bundled com ManyVids; Protection extra está na página de preços.',
)

def(
  'pricingCalculator.aside.estimatedMonthly',
  'Estimated monthly',
  'Mensual estimado',
  'Mensuel estimé',
  'Mensal estimado',
)
def(
  'pricingCalculator.aside.perMo',
  '/mo',
  '/mes',
  '/mois',
  '/mês',
)
def(
  'pricingCalculator.aside.includedAiCredits',
  'Included AI credits',
  'Créditos IA incluidos',
  'Crédits IA inclus',
  'Créditos de IA inclusos',
)
def(
  'pricingCalculator.aside.creditsExplainSettings',
  'Applied each cycle for AI tools on this plan. Top up anytime.',
  'Se aplican cada ciclo a herramientas IA de este plan. Recarga cuando quieras.',
  'Appliqués chaque cycle pour l’IA de cette formule. Recharge toujours possible.',
  'A cada ciclo para IA neste plano. Recarregue quando quiser.',
)
def(
  'pricingCalculator.aside.creditsExplainMarketing',
  'Credited every billing cycle for assistants and automations on this plan. Add credits whenever you need more runway.',
  'Acreditados cada ciclo para asistentes y automatizaciones del plan.',
  'Crédités chaque cycle pour assistants et automatisations.',
  'Creditados cada ciclo para assistentes e automações.',
)

def(
  'pricingCalculator.aside.composition',
  'Composition',
  'Detalle',
  'Décomposition',
  'Composição',
)

def(
  'pricingCalculator.marketing.startTrial',
  'Start free trial',
  'Empieza la prueba',
  'Démarrer l’essai',
  'Iniciar teste grátis',
)
def(
  'pricingCalculator.marketing.fullPricingPage',
  'Full pricing page',
  'Precios completos',
  'Page tarifs complète',
  'Página completa',
)
def(
  'pricingCalculator.marketing.openBilling',
  'Open billing',
  'Abrir facturación',
  'Ouvrir facturation',
  'Abrir cobrança',
)

def(
  'pricingCalculator.subscribePlan',
  'Subscribe — {price}{period}',
  'Suscribirse — {price}{period}',
  'S’abonner — {price}{period}',
  'Assinar — {price}{period}',
)
def(
  'pricingCalculator.subscribeProtection',
  'Subscribe — Protection {price}{period}',
  'Suscribirse — Protection {price}{period}',
  'S’abonner — Protection {price}{period}',
  'Assinar — Protection {price}{period}',
)

def(
  'pricingCalculator.subscribeFromPricingRich',
  'Subscribe from our <link>pricing page</link>. Totals match this estimate.',
  'Suscríbete desde nuestra <link>página de precios</link>. Los totales coinciden con esta vista.',
  'Abonnez-vous depuis notre <link>page tarifs</link>. Les totaux correspondent à cette estimation.',
  'Assine na <link>página de preços</link>. Totais batem com esta estimativa.',
)

def(
  'pricingCalculator.footer.comingSoonBadge',
  'Coming soon',
  'Próximamente',
  'Bientôt',
  'Em breve',
)
def(
  'pricingCalculator.footer.comingSoonBody',
  "Extra storefront coverage (beyond OnlyFans & Fansly) as its own Protection subscription is not available for new sign-ups yet—we'll announce it here when enrollment opens.",
  'La cobertura extra (más allá de OnlyFans y Fansly) como Protection propia no abre nuevas altas por ahora—lo avisamos aquí.',
  'Une Protection dédiée pour vitrines supplémentaires n’ouvre pas encore — annonce à venir.',
  'Cobertura extra própria ainda não abre novas contas — avisamos aqui.',
)

def(
  'pricingCalculator.footer.multiplatformHeading',
  'Multiplatform protection',
  'Protección multipataforma',
  'Protection multi‑plateforme',
  'Proteção multiplataforma',
)

def(
  'pricingCalculator.footer.multiplatformAria',
  'What multiplatform protection includes — storefronts beyond OnlyFans and Fansly (see logos)',
  'Qué incluye la protección multipataforma — más allá de OnlyFans y Fansly',
  'Détails Protection multi‑plateforme hors OnlyFans/Fansly',
  'Detalhes da proteção além OF/Fansly',
)

def(
  'pricingCalculator.footer.popover.sectionStorefronts',
  'Storefronts',
  'Vitrinas',
  'Vitrines',
  'Vitrines',
)
def(
  'pricingCalculator.footer.popover.sectionTools',
  'Tools',
  'Herramientas',
  'Outils',
  'Ferramentas',
)

def(
  'pricingCalculator.footer.tools.dmcaScanner',
  'DMCA scanner',
  'Escáner DMCA',
  'Scanner DMCA',
  'Scanner DMCA',
)
def(
  'pricingCalculator.footer.tools.leakDetection',
  'Leak detection',
  'Detección de fugas',
  'Détection fuites',
  'Detecção de vazamentos',
)
def(
  'pricingCalculator.footer.tools.reputationTool',
  'Reputation tool',
  'Herramienta de reputación',
  'Réputation',
  'Reputação',
)
def(
  'pricingCalculator.footer.tools.modelReputation',
  'Model reputation',
  'Reputación modelo',
  'Réputation créateur',
  'Reputação',
)

def(
  'pricingCalculator.footer.storefront.manyvids',
  'ManyVids',
  'ManyVids',
  'ManyVids',
  'ManyVids',
)
def(
  'pricingCalculator.footer.storefront.clips4sale',
  'Clips4Sale',
  'Clips4Sale',
  'Clips4Sale',
  'Clips4Sale',
)
def(
  'pricingCalculator.footer.storefront.fanvue',
  'Fanvue',
  'Fanvue',
  'Fanvue',
  'Fanvue',
)
def(
  'pricingCalculator.footer.storefront.loyalfans',
  'LoyalFans',
  'LoyalFans',
  'LoyalFans',
  'LoyalFans',
)
def(
  'pricingCalculator.footer.storefront.mym',
  'MYM',
  'MYM',
  'MYM',
  'MYM',
)

def(
  'pricingCalculator.footer.liveBody',
  'Extra storefront coverage (beyond OnlyFans & Fansly) at {usd}/mo as a separate Protection subscription—include it in your estimate here or subscribe on its own.',
  'Cobertura extra más allá de OnlyFans/Fansly a {usd}/mes como Protection aparte—inclúyela aquí o suscríbela solo.',
  'Couverture supplémentaire à {usd}/mois en Protection séparée — ajoutez ici.',
  'Cobertura extra além OF/Fansly por {usd}/mês — inclua aqui ou assine separado.',
)

def(
  'pricingCalculator.footer.toggle.addedEstimate',
  'Added (+{usd}/mo)',
  'Incluido (+{usd}/mes)',
  'Ajouté (+{usd}/mois)',
  'Incluso (+{usd}/mês)',
)
def(
  'pricingCalculator.footer.toggle.addEstimate',
  'Add to estimate (+{usd}/mo)',
  'Añadir al estimador (+{usd}/mes)',
  'Ajouter (+{usd}/mois)',
  'Somar (+{usd}/mês)',
)
def(
  'pricingCalculator.footer.toggle.protectionOnlyActive',
  'Protection only ({usd}/mo)',
  'Solo Protection ({usd}/mes)',
  'Protection uniquement ({usd}/mois)',
  'Só Protection ({usd}/mês)',
)
def(
  'pricingCalculator.footer.toggle.protectionOnly',
  'Protection only',
  'Solo Protection',
  'Protection uniquement',
  'Só Protection',
)

for (const locale of ['en', 'es', 'fr', 'pt']) {
  const merged = JSON.parse(fs.readFileSync(msgsPath(locale), 'utf8'))
  merged.pricingCalculator = buildLocaleBranch(locale).pricingCalculator
  fs.writeFileSync(msgsPath(locale), JSON.stringify(merged, null, 2) + '\n', 'utf8')
}

console.log('Merged pricingCalculator into', ['en', 'es', 'fr', 'pt'].map((l) => `messages/${l}/marketing.json`).join(', '))
