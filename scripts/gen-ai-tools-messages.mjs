import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const toolsEn = JSON.parse(fs.readFileSync(path.join(__dirname, 'tools-en.json'), 'utf8'))

const shell = {
  libraryTitle: 'AI tools',
  categories: {
    all: 'All',
    content: 'Content',
    engagement: 'Engage',
    analytics: 'Analytics',
    protection: 'Shield',
    premium: 'Premium',
  },
  chrome: {
    searchPlaceholder: 'Search by name or topic…',
    creditsWord: 'credits',
    creditsShort: 'Credits',
    creditCount: '{count, number} credits',
    upgrade: 'Upgrade',
    creditsPrefix: 'Credits: ',
    comingSoon: 'Coming soon',
    proBadge: 'Pro',
    proUpsellTitle: 'Pro',
    proUpsellBody: 'Upgrade to unlock. Not included on the free trial.',
    hoverAria: 'What {name} does — hover or focus to read',
    comingSoonCardAria: '{name} — coming soon',
    noToolsTitle: 'No tools match',
    noToolsBody: 'Try a different search or category.',
    backToStudio: 'Back to AI Studio',
    back: 'Back',
    billingTitle: 'Billing — top up or view usage',
    availableCredits: '{count, number} available',
  },
  studio: {
    mediaVaultTab: 'Media & vault',
    toolsTab: 'Tools',
  },
  helpDialog: {
    overview: 'Overview',
    howToUse: 'How to use',
    credits: 'Credits',
    creditsPerRun: '{cost} per run (where applicable).',
    tips: 'Tips',
    links: 'Links',
    noDescription: 'No detailed description is available for this tool id yet.',
    dialogDesc: 'How this tool works, credit cost, and tips.',
    ariaHow: 'How {title} works',
  },
  selector: {
    gridTitle: 'Tools',
    gridSubtitle: 'Choose an AI tool to enhance your content',
    perUse: '{cost}/use',
    commenterFanAtlasTitle: 'Commenter & Fan Atlas',
    commenterFanAtlasBlurb:
      'Web dashboard tools — same entries as AI Studio → Tools library. Fan Atlas runs Smart classify (spend, threads, freeloaders) into OnlyFans lists and Fansly tags from Arrangements.',
    commenterTitle: 'Commenter',
    commenterDesc: 'Post comments — draft replies, personas, safety flags.',
    fanAtlasTitle: 'Fan Atlas',
    fanAtlasDesc: 'Classify by spend & threads; surface freeloaders — sync lists from Arrangements.',
    proToolsTitle: 'Pro Tools',
    unlockedBadge: 'Unlocked',
    unlockProTitle: 'Unlock Pro Tools',
    unlockProBody: 'Get Competitor Analysis, Churn Prediction, Mass DM Composer and more',
    creditsAvailable: 'Credits available',
    contentStudioIdeasTab: 'Ideas',
    contentStudioCaptionsTab: 'Captions',
    runnerHintEasyPro:
      'Easy keeps steps short. Pro exposes every option. Credits apply when a run succeeds.',
    easyLabel: 'Easy',
    proLabel: 'Pro',
    layoutModeAria: 'AI tool layout mode',
    suggestionsHeading: 'Suggestions',
    cupidNewFansHeading: 'Newest fans (CRM + live lists)',
    cupidRetentionLink: 'Retention → Churn',
    cupidChurnToolLink: 'Churn Predictor',
    circeRetentionReadout: 'Circe retention readout',
    genericFallbackName: 'AI-powered tool',
    genericFallbackDesc: 'Describe what you need below and run.',
    loadingTool: 'Loading tool…',
  },
  extraLedgerTools: {
    'mass-dm-composer': 'Mass DM Composer',
    'brand-lint': 'Brand Lint',
  },
  runners: {
    shared: {
      remove: 'Remove',
      platform: 'Platform',
      end: 'End',
      voiceReady: 'Ready',
      voiceConnecting: 'Connecting',
      voiceLive: 'Live',
      voiceError: 'Error',
      voiceAriaConnecting: 'Connecting voice session',
      voiceAriaActive: 'Voice session active',
      voiceAriaStart: 'Start OpenAI Realtime voice session',
      voiceAriaEnd: 'End voice session',
      voiceSrOnly: 'OpenAI Realtime voice. ',
      input: 'Input',
      whatDoYouNeed: 'What do you need?',
      describePlain: 'Describe it in plain language…',
      enterRequest: 'Enter your request...',
    },
  },
  tools: toolsEn,
}

function writeLocale(locale, data) {
  const dir = path.join(root, 'messages', locale)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'ai-tools.json'), JSON.stringify(data, null, 2), 'utf8')
}

writeLocale('en', shell)

// ES / FR / PT: same keys; translate shell + tool names/descriptions/badges; keep longDescription in English for size
// (Follow-up: native longDescription per locale.)
const loc = (locale, overrides) => {
  const next = JSON.parse(JSON.stringify(shell))
  Object.assign(next, overrides.top ?? {})
  if (overrides.categories) Object.assign(next.categories, overrides.categories)
  if (overrides.chrome) Object.assign(next.chrome, overrides.chrome)
  if (overrides.studio) Object.assign(next.studio, overrides.studio)
  if (overrides.helpDialog) Object.assign(next.helpDialog, overrides.helpDialog)
  if (overrides.selector) Object.assign(next.selector, overrides.selector)
  if (overrides.extraLedgerTools) Object.assign(next.extraLedgerTools, overrides.extraLedgerTools)
  if (overrides.runners?.shared) Object.assign(next.runners.shared, overrides.runners.shared)
  next.tools = overrides.tools ?? next.tools
  writeLocale(locale, next)
}

const es = {
  top: { libraryTitle: 'Herramientas de IA' },
  categories: {
    all: 'Todas',
    content: 'Contenido',
    engagement: 'Interacción',
    analytics: 'Analítica',
    protection: 'Escudo',
    premium: 'Premium',
  },
  chrome: {
    searchPlaceholder: 'Buscar por nombre o tema…',
    creditsWord: 'créditos',
    creditsShort: 'Créditos',
    creditCount: '{count, number} créditos',
    upgrade: 'Mejorar plan',
    creditsPrefix: 'Créditos: ',
    comingSoon: 'Próximamente',
    proBadge: 'Pro',
    proUpsellTitle: 'Pro',
    proUpsellBody: 'Mejora el plan para desbloquear. No incluido en la prueba gratuita.',
    hoverAria: 'Qué hace {name} — pasa el cursor o enfoca para leer',
    comingSoonCardAria: '{name} — próximamente',
    noToolsTitle: 'Ninguna herramienta coincide',
    noToolsBody: 'Prueba otra búsqueda o categoría.',
    backToStudio: 'Volver a AI Studio',
    back: 'Atrás',
    billingTitle: 'Facturación — recargar o ver uso',
    availableCredits: '{count, number} disponibles',
  },
  studio: { mediaVaultTab: 'Medios y bóveda', toolsTab: 'Herramientas' },
  helpDialog: {
    overview: 'Resumen',
    howToUse: 'Cómo usar',
    credits: 'Créditos',
    creditsPerRun: '{cost} por ejecución (cuando aplique).',
    tips: 'Consejos',
    links: 'Enlaces',
    noDescription: 'Aún no hay descripción detallada para este id de herramienta.',
    dialogDesc: 'Cómo funciona la herramienta, coste en créditos y consejos.',
    ariaHow: 'Cómo funciona {title}',
  },
  selector: {
    gridTitle: 'Herramientas',
    gridSubtitle: 'Elige una herramienta de IA para potenciar tu contenido',
    perUse: '{cost}/uso',
    commenterFanAtlasTitle: 'Commenter y Fan Atlas',
    commenterFanAtlasBlurb:
      'Herramientas del panel web — mismas entradas que la biblioteca AI Studio → Tools. Fan Atlas ejecuta Smart classify (gasto, hilos, freeloaders) en listas de OnlyFans y etiquetas Fansly desde Arrangements.',
    commenterTitle: 'Commenter',
    commenterDesc: 'Comentarios en posts — borradores de respuesta, personas, banderas de seguridad.',
    fanAtlasTitle: 'Fan Atlas',
    fanAtlasDesc: 'Clasifica por gasto e hilos; detecta freeloaders — sincroniza listas desde Arrangements.',
    proToolsTitle: 'Herramientas Pro',
    unlockedBadge: 'Desbloqueado',
    unlockProTitle: 'Desbloquea herramientas Pro',
    unlockProBody: 'Obtén análisis de competencia, predicción de churn, compositor de mass DM y más',
    creditsAvailable: 'Créditos disponibles',
    contentStudioIdeasTab: 'Ideas',
    contentStudioCaptionsTab: 'Leyendas',
    runnerHintEasyPro:
      'Fácil acorta los pasos. Pro muestra todas las opciones. Los créditos se aplican cuando una ejecución tiene éxito.',
    easyLabel: 'Fácil',
    proLabel: 'Pro',
    layoutModeAria: 'Modo de diseño de la herramienta de IA',
    suggestionsHeading: 'Sugerencias',
    cupidNewFansHeading: 'Fans más nuevos (CRM + listas en vivo)',
    cupidRetentionLink: 'Retención → Churn',
    cupidChurnToolLink: 'Churn Predictor',
    circeRetentionReadout: 'Lectura de retención Circe',
    genericFallbackName: 'Herramienta con IA',
    genericFallbackDesc: 'Describe lo que necesitas abajo y ejecuta.',
    loadingTool: 'Cargando herramienta…',
  },
  extraLedgerTools: {
    'mass-dm-composer': 'Compositor de mass DM',
    'brand-lint': 'Brand Lint',
  },
  runners: {
    shared: {
      remove: 'Quitar',
      platform: 'Plataforma',
      end: 'Finalizar',
      voiceReady: 'Listo',
      voiceConnecting: 'Conectando',
      voiceLive: 'En vivo',
      voiceError: 'Error',
      voiceAriaConnecting: 'Conectando sesión de voz',
      voiceAriaActive: 'Sesión de voz activa',
      voiceAriaStart: 'Iniciar sesión de voz OpenAI Realtime',
      voiceAriaEnd: 'Finalizar sesión de voz',
      voiceSrOnly: 'Voz OpenAI Realtime. ',
      input: 'Entrada',
      whatDoYouNeed: '¿Qué necesitas?',
      describePlain: 'Descríbelo en lenguaje sencillo…',
      enterRequest: 'Escribe tu solicitud...',
    },
  },
  tools: translateTools(toolsEn, {
    'caption-generator': {
      name: 'Generador de leyendas',
      description: 'Leyendas, posts y ritmos de vídeo corto',
      badge: 'Popular',
    },
    'fantasy-writer': {
      name: 'Escritor de fantasía',
      description: 'Roleplay ligado al calendario y a los fans',
    },
    'content-ideas': {
      name: 'Contenido y leyenda',
      description: 'Ideas en tendencia y leyendas con IA',
    },
    'photo-enhancer': {
      name: 'Retoque de foto seguro',
      description: 'Desenfoque IA, luz, emoji — texto o voz',
    },
    'ai-chatter': {
      name: 'AI Chatter',
      description: 'Automatización de DMs por fan (OnlyFans)',
      badge: 'Beta',
    },
    commenter: {
      name: 'Commenter',
      description: 'Comentarios en posts: señales CRM, personas, seguridad',
    },
    housekeeping: {
      name: 'Fan Atlas',
      description: 'Segmenta fans: gasto, hilos e intención',
      badge: 'Beta',
    },
    'gift-suggester': {
      name: 'Sugeridor de regalos',
      description: 'Recomendaciones de regalo personalizadas',
    },
    'whale-whisperer': {
      name: 'Whale Whisperer',
      description: 'Chatter VIP solo borradores',
    },
    'price-optimizer': {
      name: 'Optimizador de precios',
      description: 'Sugerencias de precios óptimos',
    },
    'dm-bundle-pricing': {
      name: 'Precios de paquetes DM',
      description: 'Precio y texto de paquetes PPV / DM de pago',
    },
    'mass-dm-audience-suggester': {
      name: 'Sugeridor de audiencia mass DM',
      description: 'Ordena la mejor cohorte para el objetivo de campaña',
    },
    'mass-dm-fan-captions': {
      name: 'Leyendas mass DM por fan',
      description: 'Texto de campaña por fan desde CRM + hilo',
    },
    'mass-dm-ppv-pricing': {
      name: 'Precios PPV mass DM',
      description: 'Precios PPV por fan según gasto y metas',
    },
    'credits-planner': {
      name: 'Planificador de créditos',
      description: 'Estrategia mensual inteligente de créditos',
      badge: 'Beta',
    },
    'viral-predictor': {
      name: 'Predictor viral',
      description: 'Predicción de éxito del contenido',
      badge: 'Beta',
    },
    'churn-predictor': {
      name: 'Predictor de churn',
      description: 'Quién está en riesgo — Oráculo de Circe para retención',
    },
    'retention-tease': {
      name: 'Teaser de retención de suscriptores',
      description: 'Teasers de marca para fans que empiezan a enfriarse — al calendario.',
    },
    'income-predictor': {
      name: 'Predictor de ingresos',
      description: 'Forecast partner + cadencia + metas del próximo mes',
      badge: 'Beta',
    },
    'leak-scanner': {
      name: 'Escáner de filtraciones',
      description: 'Detección programada de filtraciones (Aegis)',
    },
    'dmca-automator': {
      name: 'Automatizador DMCA',
      description: 'Borradores automáticos de avisos (tú envías)',
    },
    'voice-cloning': {
      name: 'Clonación de voz',
      description: 'Próximamente — adapta tu fraseo para DMs y guiones',
      badge: 'Próximamente',
    },
    'competitor-analysis': {
      name: 'Análisis de competencia',
      description: 'Tú vs pares en tu franja y un escalón arriba',
      badge: 'Pro',
    },
    'circe-protection-shield': {
      name: 'Égida de Circe',
      description: 'Centro unificado de protección',
    },
    'venus-cupid': {
      name: 'Flecha de Cupido',
      description: 'Fans más nuevos — onboarding y cuidado de churn temprano',
    },
    'standard-of-attraction': {
      name: 'Estándar de atracción',
      description: 'Valoración Pro de lo comercialmente atractivo de tu contenido',
      badge: 'Pro',
    },
    'frame-studio': {
      name: 'Frame Studio',
      description: 'Edición de vídeo en el navegador. Recorta, intercambia clips y refina el ritmo.',
      badge: 'Beta',
    },
    'frame-ai-assist': {
      name: 'Frame AI Assist',
      description: 'Copiloto de edición y ritmo para Frame',
    },
    'ariadne-trace': {
      name: 'Ariadne Trace',
      description: 'Marca de forma única la exportación de cada fan — rastrea filtraciones',
      badge: 'Pro',
    },
    'ariadne-detect': {
      name: 'Ariadne Detect',
      description: 'Decodifica el marcador desde un archivo sospechoso',
    },
    'brand-uniformity': {
      name: 'Uniformidad de marca',
      description: 'Herramientas de coherencia de marca',
    },
    'mass-dm-composer': {
      name: 'Compositor de mass DM',
      description: 'Texto de campaña para mass DMs',
    },
    'venus-attraction': {
      name: 'Atracción Venus',
      description: 'Ruta heredada',
    },
  }),
}

function translateTools(base, patches) {
  const out = {}
  for (const [id, row] of Object.entries(base)) {
    const p = patches[id] ?? {}
    out[id] = {
      ...row,
      ...(p.name ? { name: p.name } : {}),
      ...(p.description ? { description: p.description } : {}),
      ...(p.longDescription ? { longDescription: p.longDescription } : {}),
      ...(p.badge ? { badge: p.badge } : {}),
    }
  }
  return out
}

const fr = {
  top: { libraryTitle: 'Outils IA' },
  categories: {
    all: 'Tous',
    content: 'Contenu',
    engagement: 'Engagement',
    analytics: 'Analytique',
    protection: 'Bouclier',
    premium: 'Premium',
  },
  chrome: {
    searchPlaceholder: 'Rechercher par nom ou sujet…',
    creditsWord: 'crédits',
    creditsShort: 'Crédits',
    creditCount: '{count, number} crédits',
    upgrade: 'Mettre à niveau',
    creditsPrefix: 'Crédits : ',
    comingSoon: 'Bientôt',
    proBadge: 'Pro',
    proUpsellTitle: 'Pro',
    proUpsellBody: 'Passez à un plan supérieur pour débloquer. Non inclus dans l’essai gratuit.',
    hoverAria: 'Ce que fait {name} — survolez ou focus pour lire',
    comingSoonCardAria: '{name} — bientôt',
    noToolsTitle: 'Aucun outil ne correspond',
    noToolsBody: 'Essayez une autre recherche ou catégorie.',
    backToStudio: 'Retour à AI Studio',
    back: 'Retour',
    billingTitle: 'Facturation — recharger ou voir l’usage',
    availableCredits: '{count, number} disponibles',
  },
  studio: { mediaVaultTab: 'Médias et coffre', toolsTab: 'Outils' },
  helpDialog: {
    overview: 'Aperçu',
    howToUse: 'Mode d’emploi',
    credits: 'Crédits',
    creditsPerRun: '{cost} par exécution (le cas échéant).',
    tips: 'Astuces',
    links: 'Liens',
    noDescription: 'Aucune description détaillée pour cet id d’outil.',
    dialogDesc: 'Fonctionnement, coût en crédits et astuces.',
    ariaHow: 'Comment fonctionne {title}',
  },
  selector: {
    gridTitle: 'Outils',
    gridSubtitle: 'Choisissez un outil IA pour enrichir votre contenu',
    perUse: '{cost}/utilisation',
    commenterFanAtlasTitle: 'Commenter et Fan Atlas',
    commenterFanAtlasBlurb:
      'Outils du tableau de bord web — mêmes entrées que la bibliothèque AI Studio → Tools. Fan Atlas exécute Smart classify (dépense, fils, freeloaders) vers les listes OnlyFans et tags Fansly depuis Arrangements.',
    commenterTitle: 'Commenter',
    commenterDesc: 'Commentaires sur les posts — brouillons, personas, signaux de sécurité.',
    fanAtlasTitle: 'Fan Atlas',
    fanAtlasDesc: 'Classer par dépense et fils ; repérer les freeloaders — sync des listes depuis Arrangements.',
    proToolsTitle: 'Outils Pro',
    unlockedBadge: 'Débloqué',
    unlockProTitle: 'Débloquer les outils Pro',
    unlockProBody: 'Analyse concurrentielle, prédiction de churn, compositeur Mass DM et plus',
    creditsAvailable: 'Crédits disponibles',
    contentStudioIdeasTab: 'Idées',
    contentStudioCaptionsTab: 'Légendes',
    runnerHintEasyPro:
      'Facile raccourcit les étapes. Pro expose toutes les options. Les crédits s’appliquent quand une exécution réussit.',
    easyLabel: 'Facile',
    proLabel: 'Pro',
    layoutModeAria: 'Mode de disposition de l’outil IA',
    suggestionsHeading: 'Suggestions',
    cupidNewFansHeading: 'Fans les plus récents (CRM + listes live)',
    cupidRetentionLink: 'Rétention → Churn',
    cupidChurnToolLink: 'Churn Predictor',
    circeRetentionReadout: 'Lecture rétention Circe',
    genericFallbackName: 'Outil IA',
    genericFallbackDesc: 'Décrivez votre besoin ci-dessous et lancez.',
    loadingTool: 'Chargement de l’outil…',
  },
  extraLedgerTools: {
    'mass-dm-composer': 'Compositeur Mass DM',
    'brand-lint': 'Brand Lint',
  },
  runners: {
    shared: {
      remove: 'Retirer',
      platform: 'Plateforme',
      end: 'Terminer',
      voiceReady: 'Prêt',
      voiceConnecting: 'Connexion',
      voiceLive: 'En direct',
      voiceError: 'Erreur',
      voiceAriaConnecting: 'Connexion de la session vocale',
      voiceAriaActive: 'Session vocale active',
      voiceAriaStart: 'Démarrer la session vocale OpenAI Realtime',
      voiceAriaEnd: 'Terminer la session vocale',
      voiceSrOnly: 'Voix OpenAI Realtime. ',
      input: 'Saisie',
      whatDoYouNeed: 'De quoi avez-vous besoin ?',
      describePlain: 'Décrivez en langage simple…',
      enterRequest: 'Entrez votre demande...',
    },
  },
  tools: translateTools(toolsEn, {
    'caption-generator': {
      name: 'Générateur de légendes',
      description: 'Légendes, posts et rythmes vidéo courts',
      badge: 'Populaire',
    },
    'fantasy-writer': { name: 'Écrivain fantasy', description: 'Jeu de rôle lié au calendrier et aux fans' },
    'content-ideas': {
      name: 'Contenu et légende',
      description: 'Idées tendance et légendes IA',
    },
    'photo-enhancer': {
      name: 'Retouche photo sûre',
      description: 'Flou IA, lumière, emoji — texte ou voix',
    },
    'ai-chatter': {
      name: 'AI Chatter',
      description: 'Automatisation des DM par fan (OnlyFans)',
      badge: 'Bêta',
    },
    commenter: {
      name: 'Commenter',
      description: 'Commentaires de posts : signaux CRM, personas, sécurité',
    },
    housekeeping: {
      name: 'Fan Atlas',
      description: 'Segmentez les fans : dépense, fils et intention',
      badge: 'Bêta',
    },
    'gift-suggester': {
      name: 'Suggéreur de cadeaux',
      description: 'Recommandations de cadeaux personnalisées',
    },
    'whale-whisperer': {
      name: 'Whale Whisperer',
      description: 'Chatter VIP — brouillons uniquement',
    },
    'price-optimizer': {
      name: 'Optimiseur de prix',
      description: 'Suggestions de prix optimaux',
    },
    'dm-bundle-pricing': {
      name: 'Tarification pack DM',
      description: 'Prix et texte des packs PPV / DM payants',
    },
    'mass-dm-audience-suggester': {
      name: 'Suggéreur d’audience Mass DM',
      description: 'Classe la meilleure cohorte pour l’objectif de campagne',
    },
    'mass-dm-fan-captions': {
      name: 'Légendes Mass DM par fan',
      description: 'Texte de campagne par fan depuis CRM + fil',
    },
    'mass-dm-ppv-pricing': {
      name: 'Tarifs PPV Mass DM',
      description: 'Prix PPV par fan selon dépense et cibles',
    },
    'credits-planner': {
      name: 'Planificateur de crédits',
      description: 'Stratégie mensuelle intelligente des crédits',
      badge: 'Bêta',
    },
    'viral-predictor': {
      name: 'Prédicteur viral',
      description: 'Prédiction de succès du contenu',
      badge: 'Bêta',
    },
    'churn-predictor': {
      name: 'Prédicteur de churn',
      description: 'Qui est à risque — Oracle Circe pour la rétention',
    },
    'retention-tease': {
      name: 'Teasing de rétention abonnés',
      description: 'Teasers de marque pour les fans qui refroidissent — calendrier.',
    },
    'income-predictor': {
      name: 'Prédicteur de revenus',
      description: 'Forecast partenaire + cadence + objectifs du mois prochain',
      badge: 'Bêta',
    },
    'leak-scanner': {
      name: 'Scanner de fuites',
      description: 'Détection planifiée des fuites (Aegis)',
    },
    'dmca-automator': {
      name: 'Automateur DMCA',
      description: 'Brouillons automatiques d’avis (vous envoyez)',
    },
    'voice-cloning': {
      name: 'Clonage vocal',
      description: 'Bientôt — adaptez votre tournure pour DMs et scripts',
      badge: 'Bientôt',
    },
    'competitor-analysis': {
      name: 'Analyse concurrentielle',
      description: 'Vous vs pairs dans votre tranche et un cran au-dessus',
      badge: 'Pro',
    },
    'circe-protection-shield': {
      name: 'Égide de Circe',
      description: 'Hub de protection unifié',
    },
    'venus-cupid': {
      name: 'Flèche de Cupidon',
      description: 'Fans les plus récents — onboarding et churn précoce',
    },
    'standard-of-attraction': {
      name: 'Standard d’attraction',
      description: 'Notation Pro de l’attractivité commerciale de votre contenu',
      badge: 'Pro',
    },
    'frame-studio': {
      name: 'Frame Studio',
      description: 'Montage vidéo dans le navigateur. Coupez, échangez des clips, peaufinez le rythme.',
      badge: 'Bêta',
    },
    'frame-ai-assist': {
      name: 'Frame AI Assist',
      description: 'Copilote de montage et de rythme pour Frame',
    },
    'ariadne-trace': {
      name: 'Ariadne Trace',
      description: 'Marquez chaque export fan — tracez les fuites',
      badge: 'Pro',
    },
    'ariadne-detect': {
      name: 'Ariadne Detect',
      description: 'Décoder le marqueur depuis un fichier suspect',
    },
    'brand-uniformity': {
      name: 'Uniformité de marque',
      description: 'Outils de cohérence de marque',
    },
    'mass-dm-composer': {
      name: 'Compositeur Mass DM',
      description: 'Texte de campagne pour mass DMs',
    },
    'venus-attraction': {
      name: 'Attraction Vénus',
      description: 'Ancienne route',
    },
  }),
}

const pt = {
  top: { libraryTitle: 'Ferramentas de IA' },
  categories: {
    all: 'Todas',
    content: 'Conteúdo',
    engagement: 'Engajamento',
    analytics: 'Análise',
    protection: 'Escudo',
    premium: 'Premium',
  },
  chrome: {
    searchPlaceholder: 'Pesquisar por nome ou tema…',
    creditsWord: 'créditos',
    creditsShort: 'Créditos',
    creditCount: '{count, number} créditos',
    upgrade: 'Fazer upgrade',
    creditsPrefix: 'Créditos: ',
    comingSoon: 'Em breve',
    proBadge: 'Pro',
    proUpsellTitle: 'Pro',
    proUpsellBody: 'Faça upgrade para desbloquear. Não incluído no teste gratuito.',
    hoverAria: 'O que {name} faz — passe o foco para ler',
    comingSoonCardAria: '{name} — em breve',
    noToolsTitle: 'Nenhuma ferramenta corresponde',
    noToolsBody: 'Tente outra pesquisa ou categoria.',
    backToStudio: 'Voltar ao AI Studio',
    back: 'Voltar',
    billingTitle: 'Cobrança — recarregar ou ver uso',
    availableCredits: '{count, number} disponíveis',
  },
  studio: { mediaVaultTab: 'Mídia e cofre', toolsTab: 'Ferramentas' },
  helpDialog: {
    overview: 'Visão geral',
    howToUse: 'Como usar',
    credits: 'Créditos',
    creditsPerRun: '{cost} por execução (quando aplicável).',
    tips: 'Dicas',
    links: 'Links',
    noDescription: 'Ainda não há descrição detalhada para este id de ferramenta.',
    dialogDesc: 'Como a ferramenta funciona, custo em créditos e dicas.',
    ariaHow: 'Como funciona {title}',
  },
  selector: {
    gridTitle: 'Ferramentas',
    gridSubtitle: 'Escolha uma ferramenta de IA para potencializar seu conteúdo',
    perUse: '{cost}/uso',
    commenterFanAtlasTitle: 'Commenter e Fan Atlas',
    commenterFanAtlasBlurb:
      'Ferramentas do painel web — mesmas entradas da biblioteca AI Studio → Tools. Fan Atlas executa Smart classify (gasto, threads, freeloaders) em listas OnlyFans e tags Fansly a partir de Arrangements.',
    commenterTitle: 'Commenter',
    commenterDesc: 'Comentários em posts — rascunhos, personas, alertas de segurança.',
    fanAtlasTitle: 'Fan Atlas',
    fanAtlasDesc: 'Classifique por gasto e threads; destaque freeloaders — sincronize listas em Arrangements.',
    proToolsTitle: 'Ferramentas Pro',
    unlockedBadge: 'Desbloqueado',
    unlockProTitle: 'Desbloqueie ferramentas Pro',
    unlockProBody: 'Análise de concorrentes, previsão de churn, compositor de mass DM e mais',
    creditsAvailable: 'Créditos disponíveis',
    contentStudioIdeasTab: 'Ideias',
    contentStudioCaptionsTab: 'Legendas',
    runnerHintEasyPro:
      'Fácil encurta os passos. Pro mostra todas as opções. Créditos aplicam quando uma execução tem sucesso.',
    easyLabel: 'Fácil',
    proLabel: 'Pro',
    layoutModeAria: 'Modo de layout da ferramenta de IA',
    suggestionsHeading: 'Sugestões',
    cupidNewFansHeading: 'Fãs mais novos (CRM + listas ao vivo)',
    cupidRetentionLink: 'Retenção → Churn',
    cupidChurnToolLink: 'Churn Predictor',
    circeRetentionReadout: 'Leitura de retenção Circe',
    genericFallbackName: 'Ferramenta com IA',
    genericFallbackDesc: 'Descreva o que precisa abaixo e execute.',
    loadingTool: 'Carregando ferramenta…',
  },
  extraLedgerTools: {
    'mass-dm-composer': 'Compositor de mass DM',
    'brand-lint': 'Brand Lint',
  },
  runners: {
    shared: {
      remove: 'Remover',
      platform: 'Plataforma',
      end: 'Encerrar',
      voiceReady: 'Pronto',
      voiceConnecting: 'Conectando',
      voiceLive: 'Ao vivo',
      voiceError: 'Erro',
      voiceAriaConnecting: 'Conectando sessão de voz',
      voiceAriaActive: 'Sessão de voz ativa',
      voiceAriaStart: 'Iniciar sessão de voz OpenAI Realtime',
      voiceAriaEnd: 'Encerrar sessão de voz',
      voiceSrOnly: 'Voz OpenAI Realtime. ',
      input: 'Entrada',
      whatDoYouNeed: 'O que você precisa?',
      describePlain: 'Descreva em linguagem simples…',
      enterRequest: 'Digite seu pedido...',
    },
  },
  tools: translateTools(toolsEn, {
    'caption-generator': {
      name: 'Gerador de legendas',
      description: 'Legendas, posts e batidas de vídeo curto',
      badge: 'Popular',
    },
    'fantasy-writer': {
      name: 'Escritor de fantasia',
      description: 'Roleplay ligado ao calendário e aos fãs',
    },
    'content-ideas': {
      name: 'Conteúdo e legenda',
      description: 'Ideias em alta e legendas com IA',
    },
    'photo-enhancer': {
      name: 'Retoque de foto seguro',
      description: 'Desfoque IA, luz, emoji — texto ou voz',
    },
    'ai-chatter': {
      name: 'AI Chatter',
      description: 'Automação de DMs por fã (OnlyFans)',
      badge: 'Beta',
    },
    commenter: {
      name: 'Commenter',
      description: 'Comentários em posts: sinais de CRM, personas, segurança',
    },
    housekeeping: {
      name: 'Fan Atlas',
      description: 'Mapeie fãs em segmentos: gasto, threads e intenção',
      badge: 'Beta',
    },
    'gift-suggester': {
      name: 'Sugeridor de presentes',
      description: 'Recomendações de presente personalizadas',
    },
    'whale-whisperer': {
      name: 'Whale Whisperer',
      description: 'Chatter VIP só rascunhos',
    },
    'price-optimizer': {
      name: 'Otimizador de preços',
      description: 'Sugestões de preços ideais',
    },
    'dm-bundle-pricing': {
      name: 'Preços de pacotes DM',
      description: 'Preço e texto de pacotes PPV / DM pagos',
    },
    'mass-dm-audience-suggester': {
      name: 'Sugeridor de audiência mass DM',
      description: 'Ordena a melhor coorte para a meta de campanha',
    },
    'mass-dm-fan-captions': {
      name: 'Legendas mass DM por fã',
      description: 'Texto de campanha por fã a partir de CRM + thread',
    },
    'mass-dm-ppv-pricing': {
      name: 'Preços PPV mass DM',
      description: 'Preços PPV por fã conforme gasto e metas',
    },
    'credits-planner': {
      name: 'Planejador de créditos',
      description: 'Estratégia mensal inteligente de créditos',
      badge: 'Beta',
    },
    'viral-predictor': {
      name: 'Preditor viral',
      description: 'Previsão de sucesso do conteúdo',
      badge: 'Beta',
    },
    'churn-predictor': {
      name: 'Preditor de churn',
      description: 'Quem está em risco — Oráculo da Circe para retenção',
    },
    'retention-tease': {
      name: 'Teaser de retenção de assinantes',
      description: 'Teasers de marca para fãs esfriando — no calendário.',
    },
    'income-predictor': {
      name: 'Preditor de receita',
      description: 'Forecast do parceiro + cadência + metas do próximo mês',
      badge: 'Beta',
    },
    'leak-scanner': {
      name: 'Scanner de vazamentos',
      description: 'Detecção agendada de vazamentos (Aegis)',
    },
    'dmca-automator': {
      name: 'Automatizador DMCA',
      description: 'Rascunhos automáticos de avisos (você envia)',
    },
    'voice-cloning': {
      name: 'Clonagem de voz',
      description: 'Em breve — combine seu jeito de falar para DMs e roteiros',
      badge: 'Em breve',
    },
    'competitor-analysis': {
      name: 'Análise de concorrentes',
      description: 'Você vs pares na sua faixa e um degrau acima',
      badge: 'Pro',
    },
    'circe-protection-shield': {
      name: 'Égide da Circe',
      description: 'Hub unificado de proteção',
    },
    'venus-cupid': {
      name: 'Flecha de Cupido',
      description: 'Fãs mais novos — onboarding e churn inicial',
    },
    'standard-of-attraction': {
      name: 'Padrão de atração',
      description: 'Avaliação Pro do apelo comercial do seu conteúdo',
      badge: 'Pro',
    },
    'frame-studio': {
      name: 'Frame Studio',
      description: 'Edição de vídeo no navegador. Corte, troque takes e refine o ritmo.',
      badge: 'Beta',
    },
    'frame-ai-assist': {
      name: 'Frame AI Assist',
      description: 'Copiloto de edição e ritmo para Frame',
    },
    'ariadne-trace': {
      name: 'Ariadne Trace',
      description: 'Marque de forma única a exportação de cada fã — rastreie vazamentos',
      badge: 'Pro',
    },
    'ariadne-detect': {
      name: 'Ariadne Detect',
      description: 'Decodifique o marcador a partir de um arquivo suspeito',
    },
    'brand-uniformity': {
      name: 'Uniformidade de marca',
      description: 'Ferramentas de coerência de marca',
    },
    'mass-dm-composer': {
      name: 'Compositor de mass DM',
      description: 'Texto de campanha para mass DMs',
    },
    'venus-attraction': {
      name: 'Atração Vênus',
      description: 'Rota legada',
    },
  }),
}

loc('es', es)
loc('fr', fr)
loc('pt', pt)

console.log('Wrote messages/{en,es,fr,pt}/ai-tools.json')
