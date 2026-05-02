/**
 * Generates messages/{en,es,fr,pt}/settings.json for Settings page i18n.
 * Run from repo root: node scripts/build-settings-i18n.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')

const msgsPath = (lc) => path.join(ROOT, 'messages', lc, 'settings.json')
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

function build(locale) {
  const out = {}
  for (const [id, langs] of Object.entries(P)) {
    setByPath(out, id, langs[locale])
  }
  return out
}

// --- Tabs & shell ---
def('tabs.profile', 'Profile', 'Perfil', 'Profil', 'Perfil')
def('tabs.notifications', 'Notifications', 'Notificaciones', 'Notifications', 'Notificações')
def('tabs.security', 'Security', 'Seguridad', 'Sécurité', 'Segurança')
def('tabs.billing', 'Billing', 'Facturación', 'Facturation', 'Cobrança')
def('tabs.usage', 'Usage', 'Uso', 'Utilisation', 'Uso')
def('tabs.integrations', 'Integrations', 'Integraciones', 'Intégrations', 'Integrações')
def('tabs.dataPrivacy', 'Data & Privacy', 'Datos y privacidad', 'Données & confidentialité', 'Dados e privacidade')
def('tabs.preferences', 'Preferences', 'Preferencias', 'Préférences', 'Preferências')

def(
  'shell.sidebarNavAria',
  'Settings navigation',
  'Navegación de ajustes',
  'Navigation des paramètres',
  'Navegação de configurações',
)
def('shell.loadingAria', 'Loading settings', 'Cargando ajustes', 'Chargement des paramètres', 'Carregando configurações')
def('shell.resources', 'Resources', 'Recursos', 'Ressources', 'Recursos')
def('shell.terms', 'Terms', 'Términos', 'Conditions', 'Termos')
def('shell.privacy', 'Privacy', 'Privacidad', 'Confidentialité', 'Privacidade')
def('shell.support', 'Support', 'Soporte', 'Assistance', 'Suporte')
def('shell.appTour', 'App tour', 'Tour de la app', 'Visite guidée', 'Tour pelo app')

// Phase 1 keys (preferences card top)
def('preferencesLocale', 'Language', 'Idioma', 'Langue', 'Idioma')
def('preferencesDateFormat', 'Date format', 'Formato de fecha', 'Format de date', 'Formato de data')
def('preferencesCurrency', 'Currency', 'Moneda', 'Devise', 'Moeda')
def('savePreferences', 'Save preferences', 'Guardar preferencias', 'Enregistrer les préférences', 'Salvar preferências')
def('savedToast', 'Preferences saved.', 'Preferencias guardadas.', 'Préférences enregistrées.', 'Preferências salvas.')

def('preferences.title', 'Preferences', 'Preferencias', 'Préférences', 'Preferências')
def(
  'preferences.description',
  'Locale, drafts, and gentle in-app guidance.',
  'Idioma, borradores y guías discretas en la app.',
  'Langue, brouillons et repères discrets.',
  'Idioma, rascunhos e orientações leves.',
)
def(
  'preferences.fanDrafts.title',
  'Fan-facing drafts (Mimic)',
  'Borradores públicos para fans (Mimic)',
  'Brouillons visibles côté fans (Mimic)',
  'Rascunhos para o público/fãs (Mimic)',
)
def(
  'preferences.fanDrafts.body',
  'Lets Mimic draft replies for review in Divine and Messages. Review-first unless you change policy in Divine tools.',
  'Deja que Mimic redacte respuestas para revisar en Divine y Mensajes; primero revisión salvo política contraria.',
  'Mimic rédige des réponses pour relecture dans Divine et Messages. Relecture d’abord sauf si vous changez la politique.',
  'Permite Mimic criar respostas para revisão em Divine e Mensagens. Revisão primeiro, salvo política nas ferramentas.',
)
def(
  'preferences.fanDrafts.tailBefore',
  'For best results, finish the ',
  'Para mejores resultados, termina ',
  'Pour un meilleur rendu, terminez ',
  'Para melhores resultados, conclua o ',
)
def(
  'preferences.fanDrafts.tailLink',
  'Mimic test',
  'test de Mimic',
  'test Mimic',
  'teste Mimic',
)
def(
  'preferences.fanDrafts.tailAfter',
  ' in Divine Manager.',
  ' en Divine Manager.',
  ' dans Divine Manager.',
  ' no Divine Manager.',
)
def(
  'preferences.fanDrafts.saved',
  'Mimic setting saved.',
  'Ajuste de Mimic guardado.',
  'Réglage Mimic enregistré.',
  'Preferência Mimic salva.',
)
def(
  'preferences.fanDrafts.saveFailed',
  'Could not save Mimic setting.',
  'No se pudo guardar el ajuste de Mimic.',
  'Impossible d’enregistrer le réglage Mimic.',
  'Não foi possível salvar a preferência Mimic.',
)
def(
  'preferences.autoSave.title',
  'Auto-save drafts',
  'Autoguardar borradores',
  'Auto-enregistrer les brouillons',
  'Salvar rascunhos automaticamente',
)
def('preferences.autoSave.hint', 'Save while you type', 'Guarda mientras escribes', 'Enregistrer pendant la frappe', 'Salvar ao digitar')
def('preferences.sound.title', 'Sound', 'Sonido', 'Son', 'Som')
def(
  'preferences.sound.hint',
  'UI sounds for notices',
  'Sonidos de interfaz para avisos',
  'Sons pour les notifications',
  'Sons para avisos',
)
def('preferences.cosmic.title', 'Cosmic guidance', 'Guía cósmica', 'Guidance cosmique', 'Orientação cósmica')
def('preferences.beta', 'Beta', 'Beta', 'Beta', 'Beta')
def('preferences.cosmic.ai', 'AI', 'IA', 'IA', 'IA')

def(
  'preferences.tipPopups.body',
  'Short insights while you browse the dashboard — turn off to stop random pop-ups (you can still open the archive anytime). Full list: {count} tips on the Circe daily page.',
  'Ideas breves al moverte por el panel: desactiva para evitar ventanas aleatorias (siempre puedes abrir el archivo). Lista: {count} consejos en Circe daily.',
  'Courtes infos en naviguant — désactive pour stopper les pop-ups (archive toujours dispo). Liste : {count} astuces Circe daily.',
  'Insights rápidos no painel — desliga pop-ups aleatórios (o arquivo segue disponível). Lista: {count} na página Circe daily.',
)

def(
  'preferences.tipPopups.title',
  'Tip popups',
  'Ventanas de consejos',
  'Astuces popup',
  'Pop-ups de dicas',
)
def(
  'preferences.openTips',
  'Open tips',
  'Ver consejos',
  'Ouvrir les astuces',
  'Ver dicas',
)
def('preferences.preview', 'Preview', 'Vista previa', 'Aperçu', 'Pré-visualizar')

def(
  'profile.title',
  'Profile',
  'Perfil',
  'Profil',
  'Perfil',
)
def(
  'profile.description',
  'Name, photo, and how the app addresses you.',
  'Nombre, foto y cómo te habla la app.',
  'Nom, photo et formulations.',
  'Nome, foto e como o produto te trata.',
)
def(
  'profile.photoHint.before',
  'JPEG or PNG, up to 2 MB — or pull your public avatar from a linked account in ',
  'JPEG o PNG, hasta 2 MB — o tu avatar público desde una cuenta vinculada en ',
  'JPEG ou PNG, max 2 Mo — ou depuis un compte lié dans ',
  'JPEG ou PNG, até 2 MB — ou o avatar público de uma conta vinculada em ',
)
def('profile.photoHint.link', 'Integrations', 'Integraciones', 'Intégrations', 'Integrações')
def('profile.photoHint.after', '.', '.', '.', '.')
def('profile.changePhoto', 'Change photo', 'Cambiar foto', 'Changer photo', 'Alterar foto')
def('profile.fromPlatform', 'From platform', 'Desde plataforma', 'Plateforme', 'Da plataforma')
def('profile.fullName', 'Full name', 'Nombre completo', 'Nom complet', 'Nome completo')
def('profile.namePlaceholder', 'Your name', 'Tu nombre', 'Votre nom', 'Seu nome')
def('profile.email', 'Email', 'Correo', 'E-mail', 'E-mail')
def(
  'profile.gender.label',
  'Gender identity ',
  'Identidad de género ',
  'Identité ',
  'Identidade de gênero ',
)
def('profile.gender.optional', '(optional)', '(opcional)', '(optionnel)', '(opcional)')
def(
  'profile.gender.placeholder',
  'Select gender identity',
  'Elige identidad',
  'Choisir l’identité',
  'Selecionar identidade',
)
def(
  'profile.gender.hint',
  'Used so Circe, Venus, and Flirt refer to you correctly.',
  'Para que Circe, Venus y Flirt te nombren bien.',
  'Pour que Circe, Venus et Flirt vous désignent correctement.',
  'Para Circe, Venus e Flirt se referirem corretamente.',
)
def('profile.pronounsLabel', 'Pronouns', 'Pronombres', 'Pronoms', 'Pronomes')
def(
  'profile.pronouns.placeholder',
  'Select pronouns',
  'Elige pronombres',
  'Choisir les pronoms',
  'Escolha os pronomes',
)
def(
  'profile.pronouns.hint',
  'Shown in the product and in AI-generated copy.',
  'Visible en el producto y en textos IA.',
  'Affiché dans le produit et dans le texte IA.',
  'Aparece no produto e em cópias geradas por IA.',
)
def(
  'profile.pronouns.customPlaceholder',
  'e.g. fae/faer',
  'p. ej. fae/faer',
  'p. ex. fae/faer',
  'ex.: fae/faer',
)
def('profile.timezone', 'Timezone', 'Zona horaria', 'Fuseau', 'Fuso horário')
def('profile.selectTimezone', 'Select timezone', 'Elige zona', 'Choisir', 'Escolha o fuso')
def(
  'profile.timezoneFootnote',
  'For calendars and reminders only. It does not switch light vs dark — that is Appearance below or the header control.',
  'Solo calendarios y recordatorios. No cambia claro/oscur — usa Apariencia más abajo o el control del header.',
  'Calendriers et rappels seulement. Pas le mode clair/sombre — voir Apparence ou l’entête.',
  'Só agendas e lembretes. Não alterna tema — use Aparência abaixo ou o controle no topo.',
)

def(
  'profile.appearance.title',
  'Appearance',
  'Apariencia',
  'Apparence',
  'Aparência',
)
def(
  'profile.appearance.followingDark',
  'Following device — Circe (dark)',
  'Siguiendo dispositivo — Circe (oscuro)',
  'Selon l’appareil — Circe (sombre)',
  'Seguindo o sistema — Circe (escuro)',
)
def(
  'profile.appearance.followingLight',
  'Following device — Venus (light)',
  'Siguiendo dispositivo — Venus (claro)',
  'Selon l’appareil — Venus (clair)',
  'Seguindo o sistema — Venus (claro)',
)
def(
  'profile.appearance.pinnedDark',
  'Pinned — Circe (dark)',
  'Fijado — Circe (oscuro)',
  'Fixée — Circe (sombre)',
  'Fixo — Circe (escuro)',
)
def(
  'profile.appearance.pinnedLight',
  'Pinned — Venus (light)',
  'Fijado — Venus (claro)',
  'Fixée — Venus (clair)',
  'Fixo — Venus (claro)',
)
def(
  'profile.appearance.systemNote',
  'OS light/dark only. Calendar times still use the timezone you set above — not this preview.',
  'Claro/oscur sólo del sistema. Los horarios usan tu zona configurada.',
  'Clair/sombre système uniquement. Les créneaux restent celui ci-dessus.',
  'Modo só do SO. Horários continuam usando o fuso acima.',
)
def(
  'profile.appearance.pinVenusLight',
  'Pin Venus (light)',
  'Fijar Venus (claro)',
  'Verrouiller Venus (clair)',
  'Fixar Venus (claro)',
)
def(
  'profile.appearance.pinCirceDark',
  'Pin Circe (dark)',
  'Fijar Circe (oscuro)',
  'Verrouiller Circe (sombre)',
  'Fixar Circe (escuro)',
)
def(
  'profile.appearance.matchDevice',
  'Match device instead',
  'Igual que el dispositivo',
  'Reprendre l’appareil',
  'Seguir dispositivo',
)
def(
  'profile.signOut',
  'Sign out',
  'Cerrar sesión',
  'Se déconnecter',
  'Sair',
)
def('profile.save', 'Save', 'Guardar', 'Enregistrer', 'Salvar')
def(
  'profile.saving',
  'Saving…',
  'Guardando…',
  'Enregistrement…',
  'Salvando…',
)
def('profile.saved', 'Saved', 'Guardado', 'Enregistré', 'Salvo')

// Profile selects (values unchanged for DB — labels only)
def(
  'profile.gender.option.unspecified',
  'Prefer not to say',
  'Prefiero no decir',
  'Je préfère ne pas préciser',
  'Prefiro não dizer',
)
def('profile.gender.option.woman', 'Woman', 'Mujer', 'Femme', 'Mulher')
def('profile.gender.option.man', 'Man', 'Hombre', 'Homme', 'Homem')
def('profile.gender.option.non-binary', 'Non-binary', 'No binario', 'Non binaire', 'Não-binárie')
def('profile.gender.option.trans-woman', 'Trans woman', 'Mujer trans', 'Femme trans', 'Mulher trans')
def('profile.gender.option.trans-man', 'Trans man', 'Hombre trans', 'Homme trans', 'Homem trans')
def('profile.gender.option.agender', 'Agender', 'Agénero', 'Agender', 'Agênero')
def(
  'profile.gender.option.other',
  'Other / describe in bio',
  'Otro / en biografía',
  'Autre / dans la bio',
  'Outro / na bio',
)
def(
  'profile.pronouns.option.unspecified',
  'Prefer not to say',
  'Prefiero no decir',
  'Je préfère ne pas préciser',
  'Prefiro não dizer',
)
def(
  'profile.pronouns.option.she/her',
  'She / Her',
  'Ella',
  'Elle',
  'Ela',
)
def('profile.pronouns.option.he/him', 'He / Him', 'Él', 'Il', 'Ele')
def('profile.pronouns.option.they/them', 'They / Them', 'Elle', 'Iel', 'Elu')
def('profile.pronouns.option.she/they', 'She / They', 'Ella / elle', 'Elle / iel', 'Ela / elu')
def('profile.pronouns.option.he/they', 'He / They', 'Él / elle', 'Il / iel', 'Ele / elu')
def('profile.pronouns.option.custom', 'Custom', 'Personalizado', 'Personnalisé', 'Personalizado')

def(
  'preferences.localeOption.en',
  'English',
  'English',
  'English',
  'English',
)
def(
  'preferences.localeOption.es',
  'Spanish',
  'Español',
  'Espagnol',
  'Espanhol',
)
def(
  'preferences.localeOption.pt',
  'Portuguese',
  'Portugués',
  'Portugais',
  'Português',
)
def(
  'preferences.localeOption.fr',
  'French',
  'Francés',
  'Français',
  'Francês',
)

def(
  'profile.timezones.america_los_angeles',
  'Pacific Time (PT)',
  'Pacífico (PT)',
  'Pacifique (PT)',
  'Pacífico (PT)',
)
def(
  'profile.timezones.america_denver',
  'Mountain Time (MT)',
  'Montaña (MT)',
  'Montagne (MT)',
  'Montanha (MT)',
)
def(
  'profile.timezones.america_chicago',
  'Central Time (CT)',
  'Centro (CT)',
  'Centre (CT)',
  'Central (CT)',
)
def(
  'profile.timezones.america_new_york',
  'Eastern Time (ET)',
  'Este (ET)',
  'Est (ET)',
  'Leste (ET)',
)
def(
  'profile.timezones.europe_london',
  'London (GMT)',
  'Londres (GMT)',
  'Londres (GMT)',
  'Londres (GMT)',
)
def(
  'profile.timezones.europe_paris',
  'Paris (CET)',
  'París (CET)',
  'Paris (CET)',
  'Paris (CET)',
)
def(
  'profile.timezones.asia_tokyo',
  'Tokyo (JST)',
  'Tokio (JST)',
  'Tokyo (JST)',
  'Tóquio (JST)',
)
def(
  'profile.timezones.australia_sydney',
  'Sydney (AEST)',
  'Sídney (AEST)',
  'Sydney (AEST)',
  'Sydney (AEST)',
)

// Security card (password + heading)
def(
  'securityCard.title',
  'Security',
  'Seguridad',
  'Sécurité',
  'Segurança',
)
def(
  'securityCard.description',
  'Protect your Circe identity and integrations',
  'Protege tu identidad en Circe y las integraciones',
  'Protégez votre identité Circe et vos intégrations',
  'Protege sua identidade Circe e integrações',
)
def(
  'securityCard.passwordHeading',
  'Sign-in password',
  'Contraseña de acceso',
  'Mot de passe de connexion',
  'Senha de acesso',
)
def(
  'securityCard.currentPasswordPlaceholder',
  'Current password',
  'Contraseña actual',
  'Mot de passe actuel',
  'Senha atual',
)
def(
  'securityCard.newPasswordPlaceholder',
  'New password',
  'Nueva contraseña',
  'Nouveau mot de passe',
  'Nova senha',
)
def(
  'securityCard.updatePassword',
  'Update password',
  'Actualizar contraseña',
  'Mettre à jour',
  'Atualizar senha',
)
def(
  'securityCard.errors.fillBoth',
  'Enter current and new password.',
  'Introduce la actual y la nueva.',
  'Saisissez ancien et nouveau.',
  'Informe atual e nova.',
)
def(
  'securityCard.errors.newTooShort',
  'New password must be at least 6 characters.',
  'La nueva debe tener al menos 6 caracteres.',
  'Au moins 6 caractères.',
  'Mínimo 6 caracteres.',
)
def(
  'securityCard.errors.noEmail',
  'No email on account.',
  'No hay correo en la cuenta.',
  'Aucun e-mail sur ce compte.',
  'Sem e-mail na conta.',
)
def(
  'securityCard.errors.currentWrong',
  'Current password is wrong.',
  'La contraseña actual no es correcta.',
  'Mot de passe actuel incorrect.',
  'Senha atual incorreta.',
)
def(
  'securityCard.errors.updateFailed',
  'Failed to update password.',
  'No se pudo actualizar la contraseña.',
  'Échec de la mise à jour.',
  'Falha ao atualizar senha.',
)
def(
  'securityCard.successUpdated',
  'Password updated.',
  'Contraseña actualizada.',
  'Mot de passe mis à jour.',
  'Senha atualizada.',
)

// Location vault
def(
  'locationVault.title',
  'Golden Hour Location Vault',
  'Bóveda de ubicación Golden Hour',
  'Coffre lieu Golden Hour',
  'Cofre de local Golden Hour',
)
def(
  'locationVault.description',
  'Save one optional location to power sunset glow predictions and positioning recommendations.',
  'Guarda una ubicación opcional para predicciones de atardecer y recomendaciones de posición.',
  'Enregistrez un lieu optionnel pour les prévisions et recommandations.',
  'Salve um local opcional para previsões de pôr do sol e posicionamento.',
)
def(
  'locationVault.encryptedBadge',
  'Encrypted',
  'Cifrado',
  'Chiffré',
  'Criptografado',
)
def(
  'locationVault.encryptionNote',
  'Stored encrypted at rest and used server-side to generate derived weather/light insights. Raw coordinates are not exposed in the well-being UI.',
  'Se guarda cifrado y se usa en el servidor para derivar clima y luz. Las coordenadas crudas no aparecen en bienestar.',
  'Stocké chiffré ; le serveur en déduit météo/lumière. Pas de coordonnées brutes dans l’UI.',
  'Armazenado criptografado; o servidor gera clima/luz. Sem coordenadas brutas na UI.',
)
def(
  'locationVault.loading',
  'Loading location vault...',
  'Cargando ubicación...',
  'Chargement du coffre…',
  'Carregando local…',
)
def(
  'locationVault.useCurrent',
  'Use my current location',
  'Usar mi ubicación actual',
  'Utiliser ma position',
  'Usar minha localização',
)
def(
  'locationVault.gpsHint',
  'Prefer not to share device GPS? Pick a city preset below.',
  '¿Sin GPS? Elige una ciudad predefinida abajo.',
  'Sans GPS ? Choisissez une ville ci-dessous.',
  'Sem GPS? Escolha uma cidade abaixo.',
)
def(
  'locationVault.quickPicks',
  'Quick picks',
  'Accesos rápidos',
  'Raccourcis',
  'Atalhos',
)
def(
  'locationVault.preset.montreal',
  'Montreal, Canada',
  'Montreal, Canadá',
  'Montréal, Canada',
  'Montreal, Canadá',
)
def(
  'locationVault.preset.la',
  'Los Angeles, US',
  'Los Ángeles, EE. UU.',
  'Los Angeles, US',
  'Los Angeles, EUA',
)
def(
  'locationVault.preset.miami',
  'Miami, US',
  'Miami, EE. UU.',
  'Miami, US',
  'Miami, EUA',
)
def(
  'locationVault.preset.london',
  'London, UK',
  'Londres, Reino Unido',
  'Londres, UK',
  'Londres, UK',
)
def(
  'locationVault.searchPlaceholder',
  'Optional: city search (e.g. Montreal, Canada)',
  'Opcional: buscar ciudad (ej. Montreal, Canadá)',
  'Optionnel : ville (ex. Montréal, Canada)',
  'Opcional: cidade (ex.: Montreal, Canadá)',
)
def(
  'locationVault.searchHint',
  'Manual search is optional. Most people can use current location or a quick pick.',
  'La búsqueda manual es opcional. La mayoría usa ubicación o un atajo.',
  'La recherche manuelle est optionnelle.',
  'Busca manual é opcional.',
)
def(
  'locationVault.savedLine',
  'Saved location:',
  'Ubicación guardada:',
  'Lieu enregistré :',
  'Local salvo:',
)
def(
  'locationVault.save',
  'Save location',
  'Guardar ubicación',
  'Enregistrer le lieu',
  'Salvar local',
)
def(
  'locationVault.remove',
  'Remove',
  'Quitar',
  'Retirer',
  'Remover',
)
def(
  'locationVault.successSaved',
  'Location saved securely for glow insights.',
  'Ubicación guardada de forma segura.',
  'Lieu enregistré pour les prévisions.',
  'Local salvo com segurança.',
)
def(
  'locationVault.successRemoved',
  'Location removed from vault.',
  'Ubicación eliminada del cofre.',
  'Lieu retiré du coffre.',
  'Local removido do cofre.',
)
def(
  'locationVault.errors.saveFailed',
  'Failed to save location',
  'No se pudo guardar',
  'Échec de l’enregistrement',
  'Falha ao salvar',
)
def(
  'locationVault.errors.queryTooShort',
  'Choose a preset, use your current location, or enter a city.',
  'Elige un atajo, tu ubicación o escribe una ciudad.',
  'Choisissez un raccourci, la position ou une ville.',
  'Use um atalho, localização atual ou digite uma cidade.',
)
def(
  'locationVault.errors.geoUnavailable',
  'Geolocation is not available on this device.',
  'La geolocalización no está disponible.',
  'Géolocalisation indisponible.',
  'Geolocalização indisponível.',
)
def(
  'locationVault.errors.permissionDenied',
  'Location permission was denied. Please allow access and try again.',
  'Permiso de ubicación denegado. Actívalo e inténtalo de nuevo.',
  'Accès refusé. Autorisez la position.',
  'Permissão negada. Autorize e tente de novo.',
)
def(
  'locationVault.errors.timeout',
  'Location request timed out. Try again.',
  'Tiempo agotado. Inténtalo de nuevo.',
  'Délai dépassé. Réessayez.',
  'Tempo esgotado. Tente de novo.',
)
def(
  'locationVault.errors.genericGeo',
  'Could not read your current location.',
  'No se pudo leer tu ubicación.',
  'Impossible de lire la position.',
  'Não foi possível ler a localização.',
)
def(
  'locationVault.errors.deleteFailed',
  'Failed to delete location',
  'No se pudo eliminar',
  'Échec de la suppression',
  'Falha ao remover',
)

// Cosmic birthday vault
def(
  'birthdayVault.title',
  'Cosmic Birthday Vault',
  'Bóveda cumpleaños cósmico',
  'Coffre anniversaire cosmique',
  'Cofre de aniversário cósmico',
)
def(
  'birthdayVault.badge',
  'Zero-Knowledge Encrypted',
  'Cifrado sin conocimiento',
  'Chiffré sans accès',
  'Criptografia zero-knowledge',
)
def(
  'birthdayVault.description',
  'Your birth data powers personalized astrological insights. Encrypted so only you can access it.',
  'Tus datos de nacimiento alimentan lecturas personalizadas. Cifrados: solo tú accedes.',
  'Vos données de naissance alimentent les lectures. Chiffrées : accès limité à vous.',
  'Seu nascimento alimenta insights. Criptografado: só você acessa.',
)
def(
  'birthdayVault.securityTitle',
  'Zero-Knowledge Security',
  'Seguridad sin conocimiento',
  'Sécurité zero-knowledge',
  'Segurança zero-knowledge',
)
def(
  'birthdayVault.securityBody',
  'Your birthday is encrypted on your device before being stored. Even we cannot see it. Only you, with your passphrase, can decrypt and view your birth data.',
  'Tu cumple se cifra en tu dispositivo antes de guardarse. Nosotros no lo vemos. Solo tú, con tu frase secreta.',
  'Chiffré sur votre appareil avant stockage. Nous ne le voyons pas. Seulement vous avec votre phrase.',
  'Criptografado no seu dispositivo. Nem nós vemos. Só você com a senha.',
)
def(
  'birthdayVault.emptyTitle',
  'Unlock Your Cosmic Potential',
  'Abre tu potencial cósmico',
  'Libérez votre potentiel cosmique',
  'Desbloqueie seu potencial cósmico',
)
def(
  'birthdayVault.emptyBody',
  'Add your birthday for personalized astrological readings, timing advice, and cosmic insights.',
  'Añade tu cumple para lecturas, timing y consejos cósmicos personalizados.',
  'Ajoutez votre naissance pour des lectures et conseils.',
  'Adicione seu aniversário para leituras e insights.',
)
def(
  'birthdayVault.setupCta',
  'Set Up Cosmic Birthday',
  'Configurar cumple cósmico',
  'Configurer l’anniversaire',
  'Configurar aniversário',
)
def(
  'birthdayVault.dialogSetupTitle',
  'Enter Your Birth Details',
  'Introduce tu fecha de nacimiento',
  'Saisir votre naissance',
  'Informe seu nascimento',
)
def(
  'birthdayVault.dialogSetupDescription',
  'Your data will be encrypted with your passphrase before storage.',
  'Tus datos se cifrarán con tu frase secreta antes de guardarse.',
  'Données chiffrées avec votre phrase avant stockage.',
  'Dados criptografados com sua senha antes de salvar.',
)
def(
  'birthdayVault.birthDateLabel',
  'Birth Date *',
  'Fecha de nacimiento *',
  'Date de naissance *',
  'Data de nascimento *',
)
def(
  'birthdayVault.includeTime',
  'Include birth time for day/night precision',
  'Incluir hora para precisión día/noche',
  'Inclure l’heure jour/nuit',
  'Incluir horário para dia/noite',
)
def(
  'birthdayVault.birthTimePlaceholder',
  'Birth time (optional)',
  'Hora (opcional)',
  'Heure (optionnelle)',
  'Hora (opcional)',
)
def(
  'birthdayVault.birthTimeHintOn',
  'Birth time enables day/night readings and more precise cosmic guidance.',
  'La hora habilita lecturas día/noche y mayor precisión.',
  'L’heure précise jour/nuit et les lectures.',
  'O horário habilita leituras dia/noite.',
)
def(
  'birthdayVault.birthTimeHintOff',
  'Birth time is optional but provides more accurate readings.',
  'La hora es opcional pero mejora la precisión.',
  'L’heure est optionnelle mais améliore la précision.',
  'Hora opcional: melhora a precisão.',
)
def(
  'birthdayVault.previewPrefix',
  'Preview:',
  'Vista previa:',
  'Aperçu :',
  'Prévia:',
)
def(
  'birthdayVault.previewElement',
  'Element',
  'Elemento',
  'Élément',
  'Elemento',
)
def(
  'birthdayVault.previewModality',
  'Modality',
  'Modalidad',
  'Modalité',
  'Modalidade',
)
def(
  'birthdayVault.previewLifePath',
  'Life Path',
  'Camino de vida',
  'Chemin de vie',
  'Caminho de vida',
)
def(
  'birthdayVault.dayBorn',
  'Day-born (Solar energy)',
  'Nacido de día (energía solar)',
  'Né de jour (solaire)',
  'Nascido de dia (solar)',
)
def(
  'birthdayVault.nightBorn',
  'Night-born (Lunar energy)',
  'Nacido de noche (energía lunar)',
  'Né de nuit (lunaire)',
  'Nascido à noite (lunar)',
)
def(
  'birthdayVault.passphraseLabel',
  'Encryption Passphrase *',
  'Frase secreta *',
  'Phrase secrète *',
  'Senha de criptografia *',
)
def(
  'birthdayVault.passphrasePlaceholder',
  'Create a strong passphrase',
  'Crea una frase fuerte',
  'Créez une phrase forte',
  'Crie uma senha forte',
)
def(
  'birthdayVault.confirmPassphraseLabel',
  'Confirm Passphrase *',
  'Confirma la frase *',
  'Confirmez la phrase *',
  'Confirme a senha *',
)
def(
  'birthdayVault.confirmPassphrasePlaceholder',
  'Confirm your passphrase',
  'Confirma tu frase',
  'Confirmez la phrase',
  'Confirme a senha',
)
def(
  'birthdayVault.passphraseWarnTitle',
  'Important:',
  'Importante:',
  'Important :',
  'Importante:',
)
def(
  'birthdayVault.passphraseWarnBody',
  'We cannot recover your passphrase. If you forget it, you will need to delete and re-enter your birthday data.',
  'No podemos recuperar tu frase. Si la olvidas, deberás borrar y volver a introducir los datos.',
  'Nous ne pouvons pas récupérer votre phrase. En cas d’oubli, supprimez et saisissez à nouveau.',
  'Não recuperamos sua senha. Se esquecer, apague e cadastre de novo.',
)
def('birthdayVault.cancel', 'Cancel', 'Cancelar', 'Annuler', 'Cancelar')
def(
  'birthdayVault.encrypting',
  'Encrypting...',
  'Cifrando…',
  'Chiffrement…',
  'Criptografando…',
)
def(
  'birthdayVault.encryptSave',
  'Encrypt & Save',
  'Cifrar y guardar',
  'Chiffrer et enregistrer',
  'Criptografar e salvar',
)
def(
  'birthdayVault.lockedTitle',
  'Birthday Data Locked',
  'Datos de cumple bloqueados',
  'Données verrouillées',
  'Dados bloqueados',
)
def(
  'birthdayVault.lockedHint',
  'Enter your passphrase to unlock cosmic insights',
  'Introduce tu frase para desbloquear',
  'Saisissez votre phrase pour déverrouiller',
  'Digite a senha para desbloquear',
)
def('birthdayVault.unlock', 'Unlock', 'Desbloquear', 'Déverrouiller', 'Desbloquear')
def(
  'birthdayVault.dialogUnlockTitle',
  'Unlock Your Cosmic Data',
  'Desbloquea tus datos cósmicos',
  'Déverrouiller vos données',
  'Desbloquear dados',
)
def(
  'birthdayVault.dialogUnlockDescription',
  'Enter your passphrase to decrypt and view your birthday data.',
  'Introduce tu frase para descifrar y ver tus datos.',
  'Saisissez votre phrase pour déchiffrer.',
  'Digite a senha para descriptografar.',
)
def(
  'birthdayVault.unlockPassphraseLabel',
  'Passphrase',
  'Frase secreta',
  'Phrase secrète',
  'Senha',
)
def(
  'birthdayVault.unlockPassphrasePlaceholder',
  'Enter your passphrase',
  'Introduce tu frase',
  'Saisissez la phrase',
  'Digite a senha',
)
def(
  'birthdayVault.decrypting',
  'Decrypting...',
  'Descifrando…',
  'Déchiffrement…',
  'Descriptografando…',
)
def(
  'birthdayVault.forgotPassphrase',
  'Forgot your passphrase?',
  '¿Olvidaste tu frase?',
  'Phrase oubliée ?',
  'Esqueceu a senha?',
)
def(
  'birthdayVault.deleteStartOver',
  'Delete & Start Over',
  'Borrar y empezar de nuevo',
  'Supprimer et recommencer',
  'Apagar e recomeçar',
)
def(
  'birthdayVault.dialogDeleteTitle',
  'Delete Birthday Data',
  'Borrar datos de cumple',
  'Supprimer la date',
  'Apagar dados de aniversário',
)
def(
  'birthdayVault.dialogDeleteDescription',
  'This will permanently delete your encrypted birthday data. You can set it up again afterward.',
  'Se borrarán de forma permanente. Podrás configurarlo de nuevo.',
  'Suppression définitive. Vous pourrez recommencer.',
  'Exclusão permanente. Você pode configurar de novo.',
)
def(
  'birthdayVault.dialogDeleteDescriptionShort',
  'This will permanently delete your encrypted birthday data.',
  'Se borrarán de forma permanente.',
  'Suppression définitive.',
  'Exclusão permanente.',
)
def(
  'birthdayVault.deleting',
  'Deleting...',
  'Borrando…',
  'Suppression…',
  'Apagando…',
)
def(
  'birthdayVault.deletePermanently',
  'Delete Permanently',
  'Borrar permanentemente',
  'Supprimer définitivement',
  'Apagar permanentemente',
)
def(
  'birthdayVault.lock',
  'Lock',
  'Bloquear',
  'Verrouiller',
  'Bloquear',
)
def(
  'birthdayVault.delete',
  'Delete',
  'Borrar',
  'Supprimer',
  'Apagar',
)
def(
  'birthdayVault.tabOverview',
  'Overview',
  'Resumen',
  'Vue d’ensemble',
  'Visão geral',
)
def(
  'birthdayVault.tabNumerology',
  'Numerology',
  'Numerología',
  'Numérologie',
  'Numerologia',
)
def(
  'birthdayVault.tabTiming',
  'Timing',
  'Momento óptimo',
  'Timing',
  'Momentos',
)
def(
  'birthdayVault.tabCosmic',
  'Cosmic',
  'Cósmico',
  'Cosmos',
  'Cósmico',
)
def(
  'birthdayVault.dayBornSoul',
  'Day-Born Soul',
  'Alma del día',
  'Âme du jour',
  'Alma do dia',
)
def(
  'birthdayVault.nightBornSoul',
  'Night-Born Soul',
  'Alma nocturna',
  'Âme de la nuit',
  'Alma da noite',
)
def(
  'birthdayVault.birthTimeUnknown',
  'Birth Time Unknown',
  'Hora de nacimiento desconocida',
  'Heure inconnue',
  'Horário desconhecido',
)
def(
  'birthdayVault.labelRulingPlanet',
  'Ruling Planet',
  'Planeta regente',
  'Planète dominante',
  'Planeta regente',
)
def(
  'birthdayVault.labelLuckyDay',
  'Lucky Day',
  'Día afortunado',
  'Jour porte-bonheur',
  'Dia de sorte',
)
def(
  'birthdayVault.keyTraits',
  'Key Traits',
  'Rasgos clave',
  'Traits clés',
  'Traços principais',
)
def(
  'birthdayVault.compatibleSigns',
  'Compatible Signs',
  'Signos compatibles',
  'Signes compatibles',
  'Signos compatíveis',
)
def(
  'birthdayVault.lifePathNumber',
  'Life Path Number',
  'Número del camino de vida',
  'Chemin de vie',
  'Número do caminho',
)
def(
  'birthdayVault.personalYearLabel',
  'Personal Year ({year})',
  'Año personal ({year})',
  'Année personnelle ({year})',
  'Ano pessoal ({year})',
)
def(
  'birthdayVault.chineseZodiac',
  'Chinese Zodiac',
  'Zodiaco chino',
  'Zodiaque chinois',
  'Zodíaco chinês',
)
def(
  'birthdayVault.luckyNumbers',
  'Lucky Numbers',
  'Números de la suerte',
  'Chiffres porte-bonheur',
  'Números da sorte',
)
def(
  'birthdayVault.bestPostingDays',
  'Best Posting Days',
  'Mejores días para publicar',
  'Meilleurs jours pour publier',
  'Melhores dias para postar',
)
def(
  'birthdayVault.luckyPostingHours',
  'Lucky Posting Hours',
  'Horas afortunadas para publicar',
  'Heures favorables pour publier',
  'Melhores horas para postar',
)
def(
  'birthdayVault.monthlyPowerDays',
  'Monthly Power Days',
  'Días de poder cada mes',
  'Jours de puissance mensuels',
  'Dias de poder mensais',
)
def(
  'birthdayVault.monthlyPowerHint',
  'These dates each month align with your cosmic energy',
  'Cada mes estas fechas alinean con tu energía',
  'Ces dates suivent votre énergie chaque mois',
  'Essas datas alinham com sua energia',
)
def(
  'birthdayVault.retrogradeTitle',
  'Retrograde Advisory',
  'Aviso retrógrado',
  'Avis rétrograde',
  'Aviso retrógrado',
)
def(
  'birthdayVault.dayBornLabel',
  'Day Born',
  'Día de nacimiento',
  'Jour de naissance',
  'Dia de nascimento',
)
def(
  'birthdayVault.seasonBornLabel',
  'Season Born',
  'Estación de nacimiento',
  'Naissance saison',
  'Estação',
)
def(
  'birthdayVault.birthstoneLabel',
  'Birthstone',
  'Piedra natalicia',
  'Pierre',
  'Pedra natalícia',
)
def(
  'birthdayVault.birthFlowerLabel',
  'Birth Flower',
  'Flor natalicia',
  'Fleur',
  'Flor de nascimento',
)
def(
  'birthdayVault.moonPhaseTitle',
  'Moon Phase at Birth',
  'Fase lunar al nacer',
  'Phase lunaire à la naissance',
  'Fase lunar ao nascer',
)
def(
  'birthdayVault.cosmicAdviceTitle',
  'Personalized Cosmic Advice',
  'Consejo cósmico personalizado',
  'Conseils cosmiques',
  'Orientação cósmica',
)
def(
  'birthdayVault.atTime',
  ' at ',
  ' a las ',
  ' à ',
  ' às ',
)
def(
  'birthdayVault.err.cryptoUnsupported',
  'Your browser does not support the required encryption features.',
  'Tu navegador no tiene cifrado requerido.',
  'Navigateur incompatible.',
  'Navegador sem suporte ao cifrado.',
)
def(
  'birthdayVault.err.noBirthDate',
  'Please enter your birth date',
  'Introduce tu fecha',
  'Saisissez la date',
  'Informe a data',
)
def(
  'birthdayVault.err.passphraseShort',
  'Passphrase must be at least 8 characters',
  'La frase debe tener al menos 8 caracteres',
  'Au moins 8 caractères',
  'Mínimo 8 caracteres',
)
def(
  'birthdayVault.err.passphraseMismatch',
  'Passphrases do not match',
  'Las frases no coinciden',
  'Les phrases ne correspondent pas',
  'As senhas não coincidem',
)
def(
  'birthdayVault.successStored',
  'Your cosmic birthday has been securely stored!',
  '¡Tu cumple se guardó con seguridad!',
  'Naissance enregistrée en sécurité !',
  'Aniversário salvo com segurança!',
)
def(
  'birthdayVault.err.saveFailed',
  'Failed to save birthday. Please try again.',
  'No se pudo guardar. Reinténtalo.',
  'Échec de l’enregistrement.',
  'Falha ao salvar. Tente novamente.',
)
def(
  'birthdayVault.err.needPassphrase',
  'Please enter your passphrase',
  'Introduce tu frase',
  'Saisissez la phrase',
  'Digite a senha',
)
def(
  'birthdayVault.err.wrongPassphrase',
  'Incorrect passphrase. Please try again.',
  'Frase incorrecta. Inténtalo de nuevo.',
  'Phrase incorrecte.',
  'Senha incorreta.',
)
def(
  'birthdayVault.err.unlockFailed',
  'Failed to unlock. Check your passphrase.',
  'No se pudo desbloquer. Revisa la frase.',
  'Échec du déverrouillage.',
  'Falha ao desbloquear.',
)
def(
  'birthdayVault.successDeleted',
  'Birthday data has been permanently deleted.',
  'Los datos se eliminaron de forma permanente.',
  'Données supprimées.',
  'Dados removidos permanentemente.',
)
def(
  'birthdayVault.err.deleteFailed',
  'Failed to delete birthday data.',
  'No se pudo borrar.',
  'Échec de la suppression.',
  'Falha ao apagar.',
)

// Notifications tab
def(
  'notifications.title',
  'Notifications',
  'Notificaciones',
  'Notifications',
  'Notificações',
)
def(
  'notifications.description',
  'Choose what you want to hear about.',
  'Elige de qué quieres saber.',
  'Choisissez ce dont vous être informée.',
  'Escolha o que quer saber.',
)
def('notifications.alertsHeading', 'Alerts', 'Alertas', 'Alertes', 'Alertas')
def(
  'notifications.email.title',
  'Email notifications',
  'Por correo',
  'E-mail',
  'Por e-mail',
)
def(
  'notifications.email.hint',
  'Account updates by email',
  'Actualizaciones de cuenta por correo',
  'Mises à jour du compte',
  'Atualizações da conta por e-mail',
)
def(
  'notifications.leak.title',
  'Leak alerts',
  'Alertas de filtraciones',
  'Fuites signalées',
  'Alertas de vazamentos',
)
def(
  'notifications.reputation.title',
  'Reputation alerts',
  'Alertas de reputación',
  'Réputation',
  'Alertas de reputação',
)
def(
  'notifications.platform.intro',
  'In-app notices when something changes on connected platforms (for example OnlyFans or Fansly).',
  'Avisos cuando cambia algo en plataformas conectadas (p. ej. OnlyFans o Fansly).',
  'Alertes lors de changements sur les plateformes liées.',
  'Avisos no app quando algo muda nas plataformas (ex.: OnlyFans ou Fansly).',
)

def(
  'notifications.platform.heading',
  'Platform activity',
  'Actividad en la plataforma',
  'Activité des plateformes',
  'Atividade da plataforma',
)
def(
  'notifications.everyMessage.title',
  'Every new message',
  'Cada mensaje nuevo',
  'Chaque nouveau message',
  'Cada mensagem nova',
)
def(
  'notifications.everyMessage.hint',
  'Notify for each new DM',
  'Avisar por cada nuevo DM',
  'Notifier chaque DM',
  'Avisar cada DM novo',
)
def(
  'notifications.everySubscriber.title',
  'Every new subscriber',
  'Cada nueva suscripción',
  'Chaque nouvel abonné',
  'Cada nova assinatura',
)
def(
  'notifications.everySubscriber.hint',
  'When someone subscribes',
  'Cuando alguien se suscribe',
  'À l’abonnement',
  'Quando alguém assina',
)
def(
  'notifications.newTips.title',
  'New tips',
  'Nuevas propinas',
  'Nouveaux tips',
  'Novas gorjetas',
)
def(
  'notifications.newTips.hint',
  'e.g. $50+ tips',
  'p. ej. tips de más de US$50',
  'Tips importants ($50+, etc.)',
  'Por exemplo gorjetas de US$50+',
)
def(
  'notifications.subExpired.title',
  'Subscription expired',
  'Suscripción vencida',
  'Fin d’abonnement',
  'Assinatura expirada',
)
def(
  'notifications.subExpired.hint',
  "When a fan's subscription lapses",
  'Cuando vence una suscripción',
  'Quand une souscription prend fin',
  'Quando a assinatura de um fã expira',
)
def(
  'notifications.subRenewed.title',
  'Subscription renewed',
  'Suscripción renovada',
  'Renouvellement',
  'Assinatura renovada',
)
def(
  'notifications.subRenewed.hint',
  'When a fan renews',
  'Cuando renovó un fan',
  'Quand elle est renouvelée',
  'Quando renova',
)
def(
  'notifications.messages.heading',
  'Messages',
  'Mensajes',
  'Messages',
  'Mensagens',
)
def(
  'notifications.messages.onlyfansNote',
  "OnlyFans can mark chats read on their servers when you open threads here — only if you opt in. You can still change read state per thread.",
  'OnlyFans puede marcar chats leídos al abrir hilos aquí sólo si lo activas. Puedes cambiar el estado en cada chat.',
  'OnlyFans peut marquer les chats lus lors de l’ouverture dans l’app, optionnel.',
  'OnlyFans pode marcar chats como lidos ao abrir — só se você optar.',
)
def(
  'notifications.messages.autoMark.title',
  'Auto-mark read when I open a thread',
  'Marcar leído al abrir hilo',
  'Marquer lu à l’ouverture du fil',
  'Marcar lido ao abrir um tópico',
)
def(
  'notifications.messages.autoMark.hint',
  'Off by default so previews do not clear unread until you choose',
  'Por defecto apagado: las vistas previas no pierden sin leer',
  'Désactivé par défaut',
  'Desligado por padrão',
)
def(
  'notifications.reports.heading',
  'Reports & updates',
  'Informes y actualizaciones',
  'Synthèses & nouveautés',
  'Relatórios e atualizações',
)

def(
  'notifications.digest.title',
  'Daily digest',
  'Resumen diario',
  'Résumé quotidien',
  'Resumo diário',
)

def(
  'notifications.digest.hint',
  'Summary of your activity',
  'Resumen de tu actividad',
  'Récap d’activité',
  'Resumo da sua atividade',
)

def(
  'notifications.weekly.title',
  'Weekly report',
  'Informe semanal',
  'Rapport hebdo',
  'Relatório semanal',
)
def(
  'notifications.weekly.hint',
  'Analytics and highlights',
  'Analíticas y destacados',
  'Chiffres clés et points forts',
  'Destaques e métricas',
)
def(
  'notifications.features.title',
  'New features',
  'Novedades del producto',
  'Nouveautés',
  'Novidades',
)

def(
  'notifications.features.hint',
  'Product announcements',
  'Anuncios del producto',
  'Annonces produit',
  'Anúncios do produto',
)

def(
  'notifications.marketing.title',
  'Marketing email',
  'Correo de marketing',
  'E-mails marketing',
  'E-mails de marketing',
)

def(
  'notifications.marketing.hint',
  'Offers and updates from us',
  'Ofertas y novedades nuestras',
  'Offres & nouvelles Circe/Venus',
  'Ofertas e novidades da equipe',
)

// Security supplemental card
def(
  'sessions.title',
  'Active sessions',
  'Sesiones activas',
  'Sessions actives',
  'Sessões ativas',
)
def(
  'sessions.description',
  'Devices where you are signed in.',
  'Dispositivos donde iniciaste sesión.',
  'Appareils connectés.',
  'Dispositivos com sessão ativa.',
)
def('sessions.thisDevice', 'This device', 'Este dispositivo', 'Cet appareil', 'Este dispositivo')
def('sessions.sampleMeta', 'Chrome on macOS · Los Angeles', 'Chrome en macOS · Los Ángeles', 'Chrome sur macOS · Los Angeles', 'Chrome no macOS · Los Angeles')
def('sessions.activeBadge', 'Active', 'Activo', 'Actif', 'Ativo')
def(
  'sessions.signOutOthers',
  'Sign out other sessions',
  'Cerrar otras sesiones',
  'Déconnecter les autres',
  'Encerrar outras sessões',
)

// Integrations gated
def(
  'integrations.apiTitle',
  'API & integrations',
  'API e integraciones',
  'API & intégrations',
  'API e integrações',
)
def(
  'integrations.viewPlans',
  'View plans',
  'Ver planes',
  'Voir les offres',
  'Ver planos',
)

// Data tab
def('data.yours.title', 'Your data', 'Tus datos', 'Vos données', 'Seus dados')
def(
  'data.yours.desc',
  'Export or refresh what we store for you.',
  'Exporta o refresca lo que guardamos.',
  'Exporter ou synchroniser vos données.',
  'Exportar ou atualizar dados armazenados.',
)

def(
  'data.export.title',
  'Export',
  'Exportación',
  'Export',
  'Exportação',
)

def(
  'data.export.hint',
  'Download a copy of your data',
  'Descarga una copia',
  'Télécharger une copie',
  'Baixar uma cópia',
)

def(
  'data.export.cta',
  'Request export',
  'Pedir exportación',
  'Demander l’export',
  'Pedir exportação',
)

def('data.sync.title', 'Sync', 'Sincronizar', 'Sync', 'Sinc')

def(
  'data.sync.hint',
  'Last synced 2 hours ago',
  'Última sync hace 2 horas',
  'Sync il y a 2 heures',
  'Última sync há 2 horas',
)

def('data.sync.cta', 'Sync now', 'Sincronizar ahora', 'Synchroniser maintenant', 'Sincronizar agora')

def(
  'data.privacy.title',
  'Privacy',
  'Privacidad',
  'Confidentialité',
  'Privacidade',
)

def(
  'data.privacy.desc',
  'How we use telemetry and personalization.',
  'Telemetría y personalización.',
  'Mesure anonyme et personnalisation.',
  'Telemetria e personalização.',
)

def('data.analytics.title', 'Analytics', 'Analítica', 'Analytiques', 'Análise')

def(
  'data.analytics.hint',
  'Anonymous usage to improve the product',
  'Uso anónimo para mejorar el producto',
  'Usage anonyme pour améliorer le produit',
  'Uso anônimo para melhorias',
)

def('data.aiPersonal.title', 'Personalized AI', 'IA personalizada', 'IA personnalisée', 'IA personalizada')

def(
  'data.aiPersonal.hint',
  'Learn from your preferences',
  'Según tus preferencias',
  'Basé sur vos préférences',
  'De acordo com suas preferências',
)

def(
  'danger.title',
  'Danger zone',
  'Zona de peligro',
  'Zone critique',
  'Zona de risco',
)
def(
  'danger.desc',
  'Irreversible actions — proceed only if you mean it.',
  'Acciones irreversibles — sólo si estás segura.',
  'Actions irréversibles.',
  'Ações irreversíveis — só se tiver certeza.',
)

def(
  'danger.deleteData.title',
  'Delete data',
  'Eliminar datos',
  'Effacer vos données',
  'Excluir dados',
)

def(
  'danger.deleteData.hint',
  'Remove stored data, keep your account',
  'Borra datos; conservas la cuenta',
  'Supprimer les données, garder le compte',
  'Remove dados salvos mantendo conta',
)

def('danger.deleteData.cta', 'Delete data', 'Eliminar datos', 'Effacer', 'Excluir dados')

def(
  'danger.deleteAccount.title',
  'Delete account',
  'Eliminar cuenta',
  'Supprimer le compte',
  'Excluir conta',
)

def(
  'danger.deleteAccount.hint',
  'Permanently remove your account',
  'Eliminación permanente del perfil',
  'Supprimer définitivement',
  'Remover a conta permanentemente',
)

def('danger.deleteAccount.cta', 'Delete account', 'Eliminar cuenta', 'Supprimer le compte', 'Excluir conta')

def(
  'errors.prefsSaveFailed',
  'Could not save preferences.',
  'No se pudieron guardar.',
  'Enregistrement impossible.',
  'Não foi possível salvar.',
)

def(
  'errors.deleteAccountCancelled',
  'Delete cancelled.',
  'Cancelado.',
  'Annulée.',
  'Cancelado.',
)

def(
  'confirm.deleteAccount',
  'Are you sure you want to delete your account? This action cannot be undone.',
  '¿Seguro que quieres borrar tu cuenta? No se puede deshacer.',
  'Supprimer définitivement votre compte ? Irréversible.',
  'Tem certeza que deseja excluir sua conta? Não há como desfazer.',
)

def(
  'avatar.photoUpdated',
  'Profile photo updated from {platform}.',
  'Foto de perfil actualizada desde {platform}.',
  'Photo de profil mise à jour depuis {platform}.',
  'Foto atualizada da {platform}.',
)

def(
  'avatar.loadFailed',
  'Could not load photo from platform.',
  'No pudimos cargar la foto desde la plataforma.',
  'Impossible de charger depuis la plateforme.',
  'Não foi possível carregar a foto.',
)

// MFA (2FA)
def(
  'mfa.title',
  'Two-factor authentication',
  'Autenticación en dos pasos',
  'Double authentification',
  'Autenticação em duas etapas',
)
def('mfa.on', 'On', 'Activo', 'Activé', 'Ativo')
def('mfa.off', 'Off', 'Inactivo', 'Désactivé', 'Inativo')
def(
  'mfa.description',
  'Enter a short code from an authenticator app after your password. Passphrases you use elsewhere in the app for encrypted data are separate from this step.',
  'Introduce un código corto tras la contraseña. Las frases de cifrado en otras partes no son esta.',
  'Code court après mot de passe. Autre chose que vos phrases locales.',
  'Código do app depois da senha. Senhas locais são outras.',
)
def('mfa.sessionPrefix', 'Session ·', 'Sesión ·', 'Session ·', 'Sessão ·')
def(
  'mfa.sessionAal2',
  'Authenticator verified',
  'Autenticador verificado',
  'App validée',
  'Autenticação confirmada',
)
def('mfa.sessionAal1', 'Password only', 'Solo contraseña', 'Mot de passe seul', 'Só senha')
def(
  'mfa.addAuthenticator',
  'Add authenticator',
  'Añadir autenticador',
  'Ajouter une app',
  'Adicionar autenticação',
)
def(
  'mfa.factorDefaultName',
  'Authenticator',
  'Autenticador',
  'Authentification',
  'Autenticador',
)
def(
  'mfa.friendlyApiName',
  'Authenticator app',
  'App de autenticación',
  'App OTP',
  'App OTP',
)
def('mfa.remove', 'Remove', 'Quitar', 'Retirer', 'Remover')
def(
  'mfa.dialogTitle',
  'Link authenticator',
  'Vincula autenticador',
  'Lier l’app OTP',
  'Vincular autenticação',
)
def(
  'mfa.dialogDescription',
  'Scan this QR code, then enter the six-digit code your app generates.',
  'Escanea el código QR y introduce el OTP de seis dígitos.',
  'Scannez le QR puis le code à six chiffres.',
  'Leia o QR e digite o código de seis dígitos.',
)
def('mfa.preparing', 'Preparing…', 'Preparando…', 'Préparation…', 'Preparando…')
def(
  'mfa.manualEntry',
  'Cannot scan? Enter manually',
  '¿Sin escaneo? Entra manual',
  'Sans scan ? Manuel',
  'Sem leitura? Digite manual',
)
def(
  'mfa.confirmationCode',
  'Confirmation code',
  'Código de confirmación',
  'Code de confirmation',
  'Código',
)
def(
  'mfa.otpAria',
  'Six-digit authentication code',
  'Código de seis dígitos',
  'Code à six chiffres',
  'Código de seis dígitos',
)
def('mfa.cancel', 'Cancel', 'Cancelar', 'Annuler', 'Cancelar')
def('mfa.verify', 'Verify', 'Verificar', 'Vérifier', 'Verificar')
def(
  'mfa.err.enrollUnavailable',
  'Multi-factor enrollment is not available for this account right now. Try again later.',
  '2FA no disponible por ahora. Inténtalo luego.',
  '2FA momentanément indisponible.',
  'MFA temporariamente indisponível.',
)
def(
  'mfa.err.enrollStart',
  'Enrollment could not start. Try again shortly.',
  'No se pudo iniciar. Reinténtalo.',
  'Démarrage impossible.',
  'Não iniciou.',
)
def(
  'mfa.err.incorrectCode',
  'Incorrect code.',
  'Código incorrecto.',
  'Code incorrect.',
  'Código incorreto.',
)
def(
  'mfa.err.verifyUnexpected',
  'Verification failed unexpectedly.',
  'Verificación falló.',
  'Échec inattendu.',
  'Falha na verificação.',
)
def(
  'mfa.err.removeDetailed',
  'Could not remove this device. Sign in again and try once more.',
  'No se quitó este dispositivo. Vuelve a iniciar sesión.',
  'Suppression impossible. Reconnectez-vous.',
  'Não removeu.',
)
def(
  'mfa.err.removeGeneric',
  'Could not remove factor.',
  'No se quitó.',
  'Suppression impossible.',
  'Erro ao remover.',
)
def(
  'mfa.success.linked',
  'Authenticator linked.',
  'Autenticador vinculado.',
  'App liée.',
  'Confirmado.',
)
def(
  'mfa.success.removed',
  'Authenticator removed.',
  'Autenticador quitado.',
  'App retirée.',
  'Removido.',
)

def(
  'housekeeping.title',
  'Arrangements (smart lists)',
  'Planes (listas inteligentes)',
  'Structures (listes dynamiques)',
  'Arrangements (listas inteligentes)',
)
def(
  'housekeeping.description',
  'Smart classify fans by spend, DM/thread activity, cold engagement, and freeloader buckets — then sync to OnlyFans lists and Fansly tags. Configure under Fans → Arrangements.',
  'Clasifica fans por gasto y actividad, sincroniza listas/tags. Configura en Fans → Planes.',
  'Segmentez vos fans puis sync OF/Fansly. Dans Fans.',
  'Classifique fans e sincronize. Configure em Fans → Arrangements.',
)
def(
  'housekeeping.cta',
  'Open Arrangements',
  'Abrir planes',
  'Ouvrir',
  'Abrir Arrangements',
)

def(
  'social.title',
  'Social',
  'Redes sociales',
  'Réseaux sociaux',
  'Social',
)
def(
  'social.description',
  'Accounts used for reputation monitoring. Only you can connect or disconnect them.',
  'Para reputación — solo tu conectar o desconectar.',
  'Pour la surveillance de réputation — vous seuls connectez.',
  'Para reputação — só você conecta/desconecta.',
)
def(
  'social.twitter',
  'Twitter/X',
  'Twitter/X',
  'Twitter/X',
  'Twitter/X',
)
def('social.instagram', 'Instagram', 'Instagram', 'Instagram', 'Instagram')
def('social.tiktok', 'TikTok', 'TikTok', 'TikTok', 'TikTok')
def(
  'social.connected',
  'Connected',
  'Conectado',
  'Connecté',
  'Conectado',
)
def(
  'social.notLinked',
  'Not linked',
  'Sin enlace',
  'Non relié',
  'Não vinculado',
)
def('social.disconnect', 'Disconnect', 'Desconectar', 'Déconnecter', 'Desconectar')
def('social.connect', 'Connect', 'Conectar', 'Connecter', 'Conectar')

// Usage & credits panel
def(
  'usageCredits.title',
  'Usage & credits',
  'Uso y créditos',
  'Utilisation & crédits',
  'Uso e créditos',
)
def(
  'usageCredits.subtitle',
  'Included allowance plus top-ups. Top-ups stay available into the next cycle.',
  'Inclusos más recargas. Las recargas siguen tras el ciclo.',
  'Inclus + recharge. Reports au cycle suivant.',
  'Incluso + topo-ups. Topo-ups continuam no próximo ciclo.',
)
def(
  'usageCredits.available',
  'Available',
  'Disponible',
  'Disponible',
  'Disponíveis',
)
def('usageCredits.creditsWord', 'credits', 'créditos', 'crédits', 'créditos')
def(
  'usageCredits.balanceAria',
  'Balance mix: {includedPct}% included, {purchasedPct}% purchased',
  'Saldo {includedPct}% incl. / {purchasedPct}% comprado',
  'Solde inclus {includedPct}% / achetés {purchasedPct}',
  '{includedPct}% inclusos / {purchasedPct}% comprados',
)
def(
  'usageCredits.included',
  'Included',
  'Incluidos',
  'Inclus',
  'Inclusos',
)
def(
  'usageCredits.purchased',
  'Purchased',
  'Comprados',
  'Achetés',
  'Comprados',
)
def(
  'usageCredits.thisCycle',
  'This billing cycle: {used} / {limit} included used',
  'Este ciclo: {used} / {limit} incluidos usados',
  'Ce cycle : {used} / {limit} inclus utilisés',
  'Este ciclo: {used} / {limit} inclusos usados',
)
def(
  'usageCredits.spendTitle',
  'Spend intelligence',
  'Intel de gastos',
  'Analyse dépenses',
  'Intel de gastos',
)
def(
  'usageCredits.spendDescription',
  'Production-grade activity: see which products draw credits and review every ledger line — pick a timeframe.',
  'Actividad: qué usa créditos y cada línea del libro.',
  'Activités : lignes détaillées.',
  'Atividade produtiva: linhas de razão.',
)
def(
  'usageCredits.tierBadge',
  'Tiered leaderboard for clarity',
  'Ranking por claridad',
  'Classements',
  'Ranking em camadas',
)
def(
  'usageCredits.openPlannerFull',
  'Open full planner view',
  'Abrir vista completa',
  'Voir le planner',
  'Abrir planner',
)
def('usageCredits.weekToggle', 'This week', 'Esta semana', 'Semaine', 'Esta semana')
def(
  'usageCredits.monthToggle',
  'This month',
  'Este mes',
  'Ce mois',
  'Este mês',
)
def(
  'usageCredits.periodSpend',
  'Period spend',
  'Gasto período',
  'Dépense période',
  'Gasto no período',
)
def(
  'usageCredits.creditsDebited',
  'credits debited',
  'créditos debitados',
  'crédits débités',
  'créditos debitados',
)
def(
  'usageCredits.ledgerLines',
  'Ledger lines',
  'Líneas',
  'Lignes livre',
  'Linhas do razão',
)
def(
  'usageCredits.visibleWindow',
  'visible in this window',
  'visibles en ventana',
  'visibles ici',
  'visível neste intervalo',
)
def(
  'usageCredits.topMover',
  'Top mover',
  'Motor principal',
  'Plus grosse ligne',
  'Principal motor',
)
def(
  'usageCredits.topMoverSubtitle',
  'Highest debit category',
  'Mayor débito',
  'Plus gros débit',
  'Maior categoria de débito',
)
def(
  'usageCredits.catLeaderboard',
  'Category leaderboard',
  'Ranking categorías',
  'Classement catég.',
  'Ranking por categoria',
)
def(
  'usageCredits.noDebitYet',
  'No debit activity this period yet — automation and AI tools appear here automatically.',
  'Sin gastos este período aún.',
  'Pas encore d’écritures.',
  'Sem lançamentos ainda.',
)
def(
  'usageCredits.rankPrimaryDriver',
  'Primary driver of spend',
  'Principal uso',
  'Principal poste',
  'Principal uso',
)
def(
  'usageCredits.rankByDebit',
  'Ranked by credits debited',
  'Por débitos',
  'Par débits',
  'Por débito',
)
def(
  'usageCredits.activityFeed',
  'Activity feed',
  'Actividad',
  'Historique',
  'Atividade',
)
def(
  'usageCredits.feed.none',
  'No transactions',
  'Sin movimientos',
  'Pas de lignes',
  'Sem lançamentos',
)
def(
  'usageCredits.feed.entries',
  '{count, plural, one {# entry} other {# entries}}',
  '{count, plural, one {# movimiento} other {# movimientos}}',
  '{count, plural, one {# écriture} other {# écritures}}',
  '{count, plural, one {# lançamento} other {# lançamentos}}',
)
def(
  'usageCredits.feed.emptyBody',
  'No transactions in this window — your ledger will populate as soon as credits move.',
  'Vacío hasta que muevan créditos.',
  'Remplira dès mouvements.',
  'Será preenchido ao mover.',
)
def(
  'usageCredits.allocationTitle',
  'Allocation planner',
  'Planificación',
  'Allocation',
  'Planejamento',
)
def(
  'usageCredits.allocationDescription',
  'The same playbook that lives in Tools — surfaced here beside your real spend.',
  'Mismo playbook que Herramientas junto al gasto.',
  'Même outil que Outils.',
  'Mesmo roteiro de Ferramentas.',
)
def(
  'usageCredits.loadingCredits',
  'Loading credits',
  'Cargando créditos',
  'Crédits',
  'Carregando créditos',
)
def(
  'usageCredits.ledger.debit',
  'Debit',
  'Débito',
  'Débit',
  'Débito',
)
def(
  'usageCredits.ledger.credit',
  'Credit',
  'Crédito',
  'Crédit',
  'Crédito',
)
def(
  'usageCredits.ledger.expireAdjustment',
  'Cycle',
  'Ciclo',
  'Cycle',
  'Ciclo',
)

def(
  'usageCredits.periodCaption.weekFallback',
  'Trailing 7 days',
  'Últimos 7 días',
  '7 derniers jours',
  'Últimos 7 dias',
)
def(
  'usageCredits.periodCaption.monthFallback',
  'Calendar month to date',
  'Mes hasta hoy',
  'Mois en cours',
  'Mês corrente',
)

// Billing overview (subset — pricing matrix labels remain EN for now)
def(
  'billing.planSectionTitle',
  'Plan & billing',
  'Plan y facturación',
  'Formule et facturation',
  'Plano e cobrança',
)
def(
  'billing.planSectionDescription',
  'Current subscription, credits, and quick actions.',
  'Suscripción, créditos y acciones.',
  'Abonnement, crédits et actions.',
  'Assinatura, créditos e atalhos.',
)
def(
  'billing.divineTrial',
  'Divine Trial',
  'Prueba Divine',
  'Essai Divine',
  'Teste Divine',
)
def('billing.active', 'Active', 'Activo', 'Actif', 'Ativo')
def('billing.free', 'Free', 'Gratis', 'Gratuit', 'Grátis')
def('billing.trial', 'Trial', 'Prueba', 'Essai', 'Teste')
def(
  'billing.trialEnds',
  'Ends {date}',
  'Termina {date}',
  'Fin {date}',
  'Termina {date}',
)
def(
  'billing.trialEnded',
  'Ended {date}',
  'Terminó {date}',
  'Terminée {date}',
  'Terminou {date}',
)
def(
  'billing.trialExpired',
  'Trial expired',
  'Prueba terminada',
  'Essai expiré',
  'Teste expirado',
)
def(
  'billing.trialRedeemed',
  'Trial redeemed',
  'Prueba canjeada',
  'Essai activé',
  'Teste resgatado',
)
def(
  'billing.renews',
  'Renews {date}',
  'Renueva {date}',
  'Renouvelle {date}',
  'Renova {date}',
)
def(
  'billing.renewsSoon',
  'Renews soon',
  'Renueva pronto',
  'Renouvellement à venir',
  'Renova em breve',
)
def(
  'billing.viewPlansBelow',
  'View plans below',
  'Planes abajo',
  'Voir formules ci-dessous',
  'Veja planos abaixo',
)
def(
  'billing.perMonth',
  'per month',
  '/ mes',
  '/ mois',
  '/ mês',
)
def(
  'billing.manageBilling',
  'Manage billing',
  'Gestionar facturación',
  'Facturation Stripe',
  'Gerenciar cobrança',
)
def(
  'billing.paymentMethod',
  'Payment method',
  'Método de pago',
  'Mode de paiement',
  'Método de pagamento',
)
def(
  'billing.cancelSubscription',
  'Cancel subscription',
  'Cancelar suscripción',
  'Annuler',
  'Cancelar',
)
def(
  'billing.viewPlans',
  'View plans',
  'Ver planes',
  'Voir offres',
  'Ver planos',
)
def('billing.period', 'Period', 'Período', 'Période', 'Período')
def(
  'billing.daysLeft',
  'days left',
  'días restantes',
  'jours restants',
  'dias restantes',
)
def(
  'billing.daysUntilEnd',
  'days until end',
  'días hasta fin',
  'jours jusqu’à fin',
  'dias até o fim',
)
def(
  'billing.aiCreditsLabel',
  'AI credits',
  'Créditos IA',
  'Crédits IA',
  'Créditos IA',
)
def(
  'billing.includedPurchasedMix',
  '{included} included · {purchased} purchased',
  '{included} incl. · {purchased} comprados',
  '{included} inclus · {purchased} payés',
  '{included} incl. · {purchased} comprados',
)
def(
  'billing.trialPool',
  'Trial pool: {n} credits (card verified).',
  'Bolsa trial: {n} créditos (tarjeta verificada).',
  'Pool essai : {n} crédits (carte).',
  'Pool trial: {n} créditos (cartão verificado).',
)
def(
  'billing.activateAfterStripe',
  'Credits activate after card setup in Stripe.',
  'Créditos al configurar tarjeta en Stripe.',
  'Activation après paiement Stripe.',
  'Créditos após cartão na Stripe.',
)
def(
  'billing.creditsPerUsd',
  '{n} credits per $1.',
  '{n} créditos por $1.',
  '{n} crédits pour 1 USD.',
  '{n} créditos por $1.',
)
def('billing.storageLabel', 'Storage', 'Almacenamiento', 'Stockage', 'Armazenamento')
def(
  'billing.messagesLabel',
  'Messages',
  'Mensajes',
  'Messages',
  'Mensagens',
)
def(
  'billing.messagesSubtitle',
  'this month (est.)',
  'este mes (est.)',
  'ce mois (est.)',
  'este mês (est.)',
)
def(
  'billing.subscriptionEnding',
  'Subscription ending',
  'Suscripción terminando',
  'Fin de l’abo',
  'Assinatura encerrando',
)
def(
  'billing.subscriptionEndingBody',
  'Access continues through {date}.',
  'El acceso sigue hasta {date}.',
  'Accès jusqu’au {date}.',
  'Acesso até {date}.',
)
def(
  'billing.periodEndFallback',
  'the end of the period',
  'fin del período',
  'fin de période',
  'o fim do período',
)
def(
  'billing.resumeBilling',
  'Resume billing',
  'Reactivar cobro',
  'Reprendre',
  'Retomar cobrança',
)
def(
  'billing.payCompleteTitle',
  'Payment complete',
  'Pago listo',
  'Paiement OK',
  'Pagamento OK',
)
def(
  'billing.payPendingTitle',
  'Payment recorded',
  'Pago registrado',
  'Paiement enreg.',
  'Registrado',
)
def(
  'billing.payFinalizingTitle',
  'Finalizing',
  'Finalizando',
  'Finalisation',
  'Finalizando',
)
def(
  'billing.syncingCredits',
  'Payment confirmed. Syncing your latest credits...',
  'Pago OK. Sincronizando créditos…',
  'Synchro des crédits…',
  'Sincronizando créditos…',
)
def(
  'billing.paySuccessMsg',
  'Payment successful — your credits are now updated.',
  'Pago correcto — créditos actualizados.',
  'Crédits mis à jour.',
  'Créditos atualizados.',
)
def(
  'billing.payReconcileMsg',
  'Payment is confirmed. Final reconciliation is in progress and will update shortly.',
  'Pago confirmado; conciliación en curso.',
  'Confirmation en cours de rapprochement.',
  'Conciliação em andamento.',
)
def(
  'billing.refreshBalance',
  'Refresh balance',
  'Actualizar saldo',
  'Rafraîchir',
  'Atualizar saldo',
)
def(
  'billing.walletUpdated',
  'Wallet updated',
  'Cartera actualizada',
  'Portefeuille',
  'Carteira atualizada',
)
def(
  'billing.notSyncedYet',
  'Not synced yet',
  'Sin sincronizar',
  'Pas encore sync',
  'Ainda não sincronizado',
)
def('billing.syncTitle', 'Sync', 'Sync', 'Sync', 'Sinc.')
def(
  'billing.topUpTitle',
  'Top Up Credits',
  'Recargar créditos',
  'Recharger',
  'Comprar créditos',
)
def(
  'billing.topUpDescription',
  'Fast top-ups for peak demand. Purchased credits roll one extra month.',
  'Recarga rápida. Los comprados ruedan un mes extra.',
  'Recharges rapides, report mensuel.',
  'Topo rápido; saldo vai para um mês extra.',
)
def(
  'billing.customAmount',
  'Custom amount',
  'Monto propio',
  'Montant',
  'Valor',
)
def(
  'billing.customMinCheckout',
  'Minimum ${min} for checkout ({perUsd} credits per $1)',
  'Mínimo ${min} checkout ({perUsd}/$1)',
  'Min ${min} ({perUsd} créd./$1)',
  'Mínimo ${min} checkout ({perUsd}/$1)',
)
def(
  'billing.purchaseCredits',
  'Purchase credits',
  'Comprar créditos',
  'Acheter',
  'Comprar',
)
def(
  'billing.creditsUsdLine',
  '${usd} · {credits} credits',
  '${usd} · {credits} créditos',
  '${usd} · {credits} crédits',
  '${usd} · {credits} créditos',
)
def(
  'billing.enterAtLeast',
  'Enter at least ${min}',
  'Mínimo ${min}',
  'Min ${min}',
  'Informe pelo menos ${min}',
)
def(
  'billing.creditsStarterLine',
  '500 credits',
  '500 créditos',
  '500 crédits',
  '500 créditos',
)
def(
  'billing.creditsStarterPrice',
  '$5',
  '$5',
  '$5',
  '$5',
)
def(
  'billing.creditsMidLine',
  '1,000 credits',
  '1 000 créditos',
  '1 000 crédits',
  '1.000 créditos',
)
def(
  'billing.creditsMidPrice',
  '$10',
  '$10',
  '$10',
  '$10',
)
def(
  'billing.creditsPlusLine',
  '2,500 credits',
  '2 500 créditos',
  '2 500 crédits',
  '2.500 créditos',
)
def(
  'billing.creditsPlusPrice',
  '$25',
  '$25',
  '$25',
  '$25',
)
def(
  'billing.plannerCardTitle',
  'Credits planner',
  'Planner de créditos',
  'Planner crédits',
  'Planner de créditos',
)
def(
  'billing.plannerCardSubtitle',
  'Day-by-day planning lives on the dashboard.',
  'Planificación día a día en el dashboard.',
  'Pilotage jour par jour.',
  'Planeje dia a dia no painel.',
)
def(
  'billing.openPlanner',
  'Open planner',
  'Abrir planner',
  'Ouvrir',
  'Abrir planner',
)

def(
  'billing.pricingPlansTitle',
  'Plans & pricing',
  'Planes y precios',
  'Plans & prix',
  'Planos',
)
def(
  'billing.pricingPlansDescriptionLead',
  'Same tiers as the',
  'Mismos niveles que',
  'Mêmes offres que',
  'Mesmos níveis da',
)
def(
  'billing.publicPricingLink',
  'public pricing page',
  'página pública',
  'page prix publique',
  'página pública',
)
def(
  'billing.pricingPlansDescriptionTrail',
  'Checkout uses the total shown in the estimate below.',
  'El checkout usa el total mostrado abajo.',
  'Le total estimé définit régler.',
  'Checkout usa total da estimativa abaixo.',
)

def(
  'billing.manyvidsCheckboxAria',
  'Include anti-piracy coverage for other storefronts with Bundled plan. {credits, number} AI credits per billing cycle.',
  'Incluir cobertura antipiratería para otras tiendas con plan Bundled. {credits, number} créditos IA por ciclo.',
  'Inclure la couverture anti-piratage pour d’autres vitrines avec l’offre groupée. {credits, number} crédits IA par cycle.',
  'Incluir anti-pirataria para outras vitrines no plano Bundled. {credits, number} créditos de IA por ciclo.',
)
def(
  'billing.antipiracyOtherPlatformsTitle',
  'Anti-piracy coverage for other platforms',
  'Cobertura antipiratería en otras plataformas',
  'Couverture anti-piratage pour d’autres plateformes',
  'Cobertura anti-pirataria em outras plataformas',
)
def(
  'billing.coverageInfoTrigger',
  'Coverage',
  'Cobertura',
  'Couverture',
  'Cobertura',
)
def(
  'billing.antipiracyPopoverStorefrontsTitle',
  'Storefronts',
  'Vitrinas',
  'Vitrines',
  'Vitrines',
)
def(
  'billing.antipiracyPopoverStorefrontsBody',
  'Same coverage family as the multi-platform row on pricing (Clips4Sale, Fanvue, Loyalfans, MYM, and similar). Bundled into your workspace total—not a separate subscription.',
  'Misma familia de cobertura que la fila multiplataforma en precios (Clips4Sale, Fanvue, Loyalfans, MYM y similares). Incluida en el total del workspace — no es suscripción aparte.',
  'Même famille que la ligne multi‑plateforme des tarifs (Clips4Sale, Fanvue, Loyalfans, MYM, etc.). Inclus dans le total workspace — pas d’abonnement séparé.',
  'Mesma família da linha multiplataforma em preços (Clips4Sale, Fanvue, Loyalfans, MYM etc.). Dentro do total do workspace — sem assinatura separada.',
)
def(
  'billing.antipiracyPopoverStandaloneRich',
  'Broader standalone Protection (separate bill) is <highlight>coming soon</highlight> from the Protection card below—we are not enrolling new plans yet.',
  'La Protección independiente más amplia (cargo aparte) <highlight>llegará pronto</highlight> desde la tarjeta de abajo — aún no abrimos altas nuevas.',
  'Une Protection autonome plus large (facturation séparée) arrive <highlight>bientôt</highlight> dans la carte ci‑dessous — pas encore d’inscriptions.',
  'Protection autônomo mais amplo (cobrança separada) <highlight>em breve</highlight> no card abaixo — ainda sem novas altas.',
)
def(
  'billing.antipiracyPopoverStandaloneAvailable',
  'For standalone protection across more sites, use the Protection add-on below (separate bill).',
  'Para protección independiente en más sitios, usa el complemento Protection de abajo (cargo aparte).',
  'Pour une protection autonome sur plus de sites, utilisez l’add‑on Protection ci‑dessous (facturation séparée).',
  'Para proteção autônoma em mais sites, use o add-on Protection abaixo (cobrança separada).',
)
def(
  'billing.antipiracySrOnlyLead',
  'Anti-piracy coverage for additional storefronts with Bundled plan only. {credits, number} AI credits per billing cycle. Price follows your revenue band.',
  'Cobertura antipiratería para vitrinas adicionales solo con plan Bundled. {credits, number} créditos IA por ciclo. El precio sigue tu banda de ingresos.',
  'Couverture anti-piratage pour vitrines supplémentaires avec l’offre groupée uniquement. {credits, number} crédits IA par cycle. Le prix suit votre tranche.',
  'Anti-pirataria para vitrines extras só no plano Bundled. {credits, number} créditos de IA por ciclo. O preço segue sua faixa de receita.',
)
def(
  'billing.antipiracySrOnlyComingSoon',
  'Standalone Multiplatform Protection below is coming soon for new subscriptions.',
  'La Protection multipataforma independiente de abajo llegará pronto para nuevas suscripciones.',
  'La Protection multi‑plateforme autonome ci‑dessous arrive bientôt pour les nouveaux abonnements.',
  'A Protection multiplataforma autônoma abaixo chega em breve para novas assinaturas.',
)
def(
  'billing.antipiracySrOnlySeparate',
  'Protection add-on below is billed separately.',
  'El complemento Protection de abajo se factura aparte.',
  'L’add‑on Protection ci‑dessous est facturé séparément.',
  'O add-on Protection abaixo é cobrado separadamente.',
)
def(
  'billing.estimateAntiPiracyAddon',
  'Anti-piracy add-on',
  'Complemento antipiratería',
  'Add-on anti-piratage',
  'Add-on anti-pirataria',
)
def(
  'billing.estimateFocusTotal',
  'Focus total',
  'Total Focus',
  'Total focus',
  'Total Focus',
)
def(
  'billing.estimateAddon',
  'Add-on estimate',
  'Estimado del complemento',
  'Estimation add-on',
  'Estimativa do add-on',
)
def(
  'billing.perMoAbbrev',
  '/mo',
  '/mes',
  '/mois',
  '/mês',
)
def(
  'billing.fullRevenueBandMatrix',
  'Full revenue band matrix',
  'Matriz completa de bandas de ingreso',
  'Matrice complète des tranches',
  'Matriz completa de faixas',
)
def(
  'billing.showAllTiers',
  'Show all tiers',
  'Ver todos los niveles',
  'Voir tous les niveaux',
  'Ver todos os níveis',
)
def(
  'billing.matrixColRevenue',
  'Revenue',
  'Ingresos',
  'Revenus',
  'Receita',
)
def(
  'billing.matrixColOnlyfans',
  'OnlyFans',
  'OnlyFans',
  'OnlyFans',
  'OnlyFans',
)
def(
  'billing.matrixColFansly',
  'Fansly',
  'Fansly',
  'Fansly',
  'Fansly',
)
def(
  'billing.matrixColBundled',
  'Bundled (OnlyFans + Fansly)',
  'Bundled (OnlyFans + Fansly)',
  'Groupé (OnlyFans + Fansly)',
  'Bundled (OnlyFans + Fansly)',
)
def(
  'billing.protectionStandaloneEyebrow',
  'Stand alone',
  'Independiente',
  'Autonome',
  'Avulso',
)
def(
  'billing.protectionPlanFallbackName',
  'Protection & Anti-Piracy',
  'Protection y antipiratería',
  'Protection & anti-piratage',
  'Protection e anti-pirataria',
)
def(
  'billing.comingSoonBadge',
  'Coming soon',
  'Próximamente',
  'Bientôt',
  'Em breve',
)
def(
  'billing.protectionDescComingSoon',
  'Standalone anti-piracy for extra fan and clip storefronts will be available as its own Protection subscription—we are not enrolling new plans yet. ManyVids Bundled add-on above stays on your main subscription when selected.',
  'La antipiratería independiente para vitrinas extra estará como suscripción Protection propia — aún no abrimos altas. El complemento ManyVids Bundled de arriba sigue en tu suscripción principal si lo eliges.',
  'L’anti-piratage autonome pour vitrines supplémentaires sera une souscription Protection dédiée — pas encore d’inscriptions. L’add‑on ManyVids Bundled ci‑dessus reste sur votre abonnement principal si sélectionné.',
  'Anti-pirataria autônoma para vitrinas extras será assinatura Protection própria — sem novas altas ainda. O add-on ManyVids Bundled acima permanece na assinatura principal se selecionado.',
)
def(
  'billing.protectionDescLive',
  'Standalone monthly anti-piracy for extra fan and clip storefronts—leak checks, takedown help, and a dedicated Protection hub. Separate bill from single-platform and Bundled plans: ManyVids on the Bundled plan above is part of that subscription; Protection is its own subscription for broader storefront coverage.',
  'Antipiratería mensual independiente para vitrinas extra: fugas de contenido, retiradas y hub Protection. Cargo aparte frente a planes de una sola plataforma o Bundled: ManyVids en el Bundled de arriba forma parte de esa suscripción; Protection es propia para cobertura más amplia.',
  'Anti‑piratage mensuel autonome pour vitrines supplémentaires — fuites, retraits et hub Protection. Facturation séparée des plans simple ou groupé : ManyVids dans le Bundled ci‑dessus fait partie de cet abonnement ; Protection est une souscription dédiée pour une couverture plus large.',
  'Anti-pirataria mensal autônomo para vitrinas extras — vazamentos, remoções e hub Protection. Cobrança separada dos planos single ou Bundled: ManyVids no Bundled acima faz parte dessa assinatura; Protection é assinatura própria para cobertura mais ampla.',
)
def(
  'billing.protectionActiveOnAccount',
  'Active on your account.',
  'Activo en tu cuenta.',
  'Actif sur votre compte.',
  'Ativo na sua conta.',
)
def(
  'billing.protectionEnrollmentClosed',
  'New subscriptions are not open yet. We will enable checkout on this card when Multiplatform Protection enrollment launches.',
  'Las altas nuevas aún no están abiertas. Activaremos el checkout aquí cuando abra el registro de Protection multipataforma.',
  'Les nouvelles souscriptions ne sont pas ouvertes. Nous activerons le paiement ici au lancement des inscriptions Protection multi‑plateforme.',
  'Novas assinaturas ainda não estão abertas. Ativaremos o checkout neste card quando o cadastro de Protection multiplataforma abrir.',
)
def(
  'billing.monthlyEyebrow',
  'Monthly',
  'Mensual',
  'Mensuel',
  'Mensal',
)
def(
  'billing.protectionUpdatePayment',
  'Update payment',
  'Actualizar pago',
  'Mettre à jour le paiement',
  'Atualizar pagamento',
)
def(
  'billing.protectionSubscribeCta',
  'Subscribe — {price}{period}',
  'Suscribirse — {price}{period}',
  'S’abonner — {price}{period}',
  'Assinar — {price}{period}',
)
def(
  'billing.trialCardEyebrow',
  'Trial',
  'Prueba',
  'Essai',
  'Teste',
)
def(
  'billing.trialUnlockHeading',
  'Unlock trial access',
  'Desbloquear acceso de prueba',
  'Débloquer l’essai',
  'Desbloquear o teste',
)
def(
  'billing.trialUnlockBody',
  'Add a card on file—no charge until the trial ends. Trial credits activate once Stripe confirms your payment method.',
  'Añade una tarjeta — sin cargo hasta que termine la prueba. Los créditos se activan cuando Stripe confirme el método de pago.',
  'Ajoutez une carte — pas de prélèvement avant la fin de l’essai. Les crédits s’activent quand Stripe confirme le moyen de paiement.',
  'Adicione um cartão — sem cobrança até o fim do teste. Os créditos ativam quando o Stripe confirmar o pagamento.',
)
def(
  'billing.trialDueToday',
  'Due today',
  'A pagar hoy',
  'Dû aujourd’hui',
  'Vence hoje',
)
def(
  'billing.trialPoolActiveLine',
  '{credits, number} AI credits in the trial pool while your trial is active.',
  '{credits, number} créditos IA en el pool de prueba mientras dure.',
  '{credits, number} crédits IA dans le pool d’essai tant qu’il est actif.',
  '{credits, number} créditos de IA no pool de teste enquanto estiver ativo.',
)
def(
  'billing.trialAddCardCta',
  'Add card · start trial',
  'Añadir tarjeta · iniciar prueba',
  'Ajouter carte · lancer l’essai',
  'Adicionar cartão · iniciar teste',
)
def(
  'billing.trialFinePrint',
  'Billing begins when the trial window ends unless you cancel beforehand. You authorize future charges by completing Stripe Checkout.',
  'La facturación empieza al terminar la prueba salvo que canceles antes. Al completar Stripe Checkout autorizas cargos futuros.',
  'La facturation démarre à la fin de l’essai sauf annulation. Le paiement Stripe autorise les prélèvements futurs.',
  'A cobrança começa ao fim do teste, salvo cancelamento. Ao concluir o Checkout você autoriza cobranças futuras.',
)
def(
  'billing.documentsEyebrow',
  'Documents',
  'Documentos',
  'Documents',
  'Documentos',
)
def(
  'billing.invoicesHeading',
  'Invoices',
  'Facturas',
  'Factures',
  'Faturas',
)
def(
  'billing.invoicesDescription',
  'Hosted by Stripe—the same ledger and receipts as Checkout and your billing portal.',
  'Gestionado por Stripe: el mismo libro y recibos que Checkout y tu portal de facturación.',
  'Hébergé par Stripe — même registre et reçus que Checkout et le portail.',
  'Hospedado pelo Stripe — mesmo extrato e recibos do Checkout e do portal.',
)
def(
  'billing.viewInvoices',
  'View invoices',
  'Ver facturas',
  'Voir les factures',
  'Ver faturas',
)
def(
  'billing.opensStripePortal',
  'Opens Stripe Customer Portal',
  'Abre el portal de cliente de Stripe',
  'Ouvre le portail client Stripe',
  'Abre o portal do cliente Stripe',
)
def(
  'billing.invoicesNothingYet',
  'Nothing yet',
  'Nada por ahora',
  'Rien pour l’instant',
  'Nada ainda',
)
def(
  'billing.invoicesSubscribeHint',
  'Subscribe and your invoice PDFs will show up here—delivered through Stripe automatically.',
  'Al suscribirte, los PDF aparecerán aquí — Stripe los envía automáticamente.',
  'En vous abonnant, les PDF apparaîtront ici — envoyés automatiquement par Stripe.',
  'Ao assinar, os PDFs aparecem aqui — enviados pelo Stripe automaticamente.',
)
def(
  'billing.antipiracyBundledWorkspace',
  'Bundled workspace',
  'Workspace Bundled',
  'Workspace groupé',
  'Workspace bundled',
)
def(
  'billing.storageTooltipVault',
  'Creatix vault: {quotaMb} MB cap ({quotaSource}). Usage from Supabase Storage.',
  'Vault Creatix: tope de {quotaMb} MB ({quotaSource}). Uso desde Supabase Storage.',
  'Vault Creatix : plafond {quotaMb} Mo ({quotaSource}). Usage via Supabase Storage.',
  'Vault Creatix: teto de {quotaMb} MB ({quotaSource}). Uso no Supabase Storage.',
)
def(
  'billing.storageTooltipFallback',
  'Storage cap: {capMb} MB. Connect to load live usage from the vault.',
  'Tope de almacenamiento: {capMb} MB. Conecta para ver uso en vivo del vault.',
  'Plafond stockage : {capMb} Mo. Connectez‑vous pour le live du vault.',
  'Teto de armazenamento: {capMb} MB. Conecte para carregar uso ao vivo do vault.',
)

for (const locale of ['en', 'es', 'fr', 'pt']) {
  const out = build(locale)
  fs.writeFileSync(msgsPath(locale), JSON.stringify(out, null, 2) + '\n', 'utf8')
}

console.log('Wrote', ['en', 'es', 'fr', 'pt'].map((l) => `messages/${l}/settings.json`).join(', '))
