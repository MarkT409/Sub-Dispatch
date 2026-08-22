export type CrewLocale = "en" | "es";

export type CrewMessageKey =
  | "mySchedule"
  | "jobBoard"
  | "jobBoardHintTeam"
  | "jobBoardHintYou"
  | "jobBoardHintFull"
  | "current"
  | "currentHint"
  | "previous"
  | "previousHint"
  | "pending"
  | "settings"
  | "signOut"
  | "myJobs"
  | "accept"
  | "decline"
  | "saving"
  | "statusAccepted"
  | "statusDeclined"
  | "statusPending"
  | "statusScheduled"
  | "colDate"
  | "colJob"
  | "colAddress"
  | "colAssignee"
  | "colKind"
  | "colStatus"
  | "colActions"
  | "noCurrentJobs"
  | "noPreviousJobs"
  | "noJobsThisWeek"
  | "noJobsThisWeekHint"
  | "week"
  | "weeksShort"
  | "jobsShort"
  | "jobSingular"
  | "jobPlural"
  | "weekSingular"
  | "weekPlural"
  | "prevWeek"
  | "nextWeek"
  | "thisWeek"
  | "noJobsDay"
  | "swipeBoardHint"
  | "emptyWeekViewer"
  | "languageTitle"
  | "languageHint"
  | "languageEnglish"
  | "languageSpanish"
  | "chooseLanguageTitle"
  | "chooseLanguageSubtitle"
  | "contactTitle"
  | "contactHint"
  | "name"
  | "nameLockedHint"
  | "phone"
  | "phoneHint"
  | "email"
  | "emailHint"
  | "smsConsent"
  | "smsConsentRequired"
  | "saveContact"
  | "alertsTitle"
  | "alertsHint"
  | "alertsToggle"
  | "alertsOn"
  | "alertsEnable"
  | "alertsBlocked"
  | "profileSaved"
  | "alertsOnToast"
  | "alertsOffToast"
  | "couldNotSave"
  | "jobAccepted"
  | "jobDeclined"
  | "respondFailed"
  | "rough"
  | "trim"
  | "service"
  | "settingsTitle"
  | "pushNewJobTitle"
  | "messages"
  | "messagesEmpty"
  | "messagesTitle"
  | "noNewMessages"
  | "acceptAll"
  | "acceptAllCount"
  | "acceptingAll"
  | "jobsAcceptedAll";

const en: Record<CrewMessageKey, string> = {
  mySchedule: "My schedule",
  jobBoard: "Job board",
  jobBoardHintTeam: "This week’s jobs for {team} (read-only)",
  jobBoardHintYou: "This week’s jobs assigned to you (read-only)",
  jobBoardHintFull: "Full weekly board (read-only) — Current & Previous below are yours",
  current: "Current",
  currentHint: "Today and upcoming — accept/decline when dispatched",
  previous: "Previous",
  previousHint: "Past jobs by month, then Mon–Fri week",
  pending: "pending",
  settings: "Settings",
  signOut: "Sign out",
  myJobs: "My jobs",
  accept: "Accept",
  decline: "Decline",
  saving: "Saving…",
  statusAccepted: "Accepted",
  statusDeclined: "Declined",
  statusPending: "Pending",
  statusScheduled: "Scheduled",
  colDate: "Date",
  colJob: "Job",
  colAddress: "Address",
  colAssignee: "Assignee",
  colKind: "Kind",
  colStatus: "Status",
  colActions: "Actions",
  noCurrentJobs: "No current jobs for your team.",
  noPreviousJobs: "No previous jobs yet.",
  noJobsThisWeek: "No board jobs for {who} this week.",
  noJobsThisWeekHint:
    "No board jobs for {who} this week — use Prev / Next to change weeks.",
  week: "Week",
  weeksShort: "wk",
  jobsShort: "job",
  jobSingular: "job",
  jobPlural: "jobs",
  weekSingular: "week",
  weekPlural: "weeks",
  prevWeek: "← Prev",
  nextWeek: "Next →",
  thisWeek: "This week",
  noJobsDay: "No jobs",
  swipeBoardHint: "Swipe sideways to see Mon–Fri",
  emptyWeekViewer:
    "No jobs on the board for this week. Use Prev / Next to change weeks.",
  languageTitle: "Language",
  languageHint: "Choose English or Español for the crew app.",
  languageEnglish: "English",
  languageSpanish: "Español",
  chooseLanguageTitle: "Choose your language",
  chooseLanguageSubtitle: "Elige tu idioma",
  contactTitle: "Your contact info",
  contactHint:
    "Keep this up to date so you can sign in and get job texts. You can add a phone or email anytime.",
  name: "Name",
  nameLockedHint: "Ask a supervisor if your name needs to change.",
  phone: "Phone",
  phoneHint:
    "Used for sign-in links by text and for job alert texts. Must match the number you log in with.",
  email: "Email (optional)",
  emailHint:
    "Used for sign-in links by email and for job alert emails (optional).",
  smsConsent:
    "I agree to receive SMS messages from Crew Dispatch for account sign-in and job alerts. Message frequency varies. Message and data rates may apply. Reply STOP to opt out, HELP for help. Consent is not a condition of employment. See our Privacy Policy.",
  smsConsentRequired: "Check the SMS consent box to save a phone number.",
  saveContact: "Save contact info",
  alertsTitle: "Job alerts",
  alertsHint:
    "New assignments also go to your phone and email above. Turn on push for alerts on this device.",
  alertsToggle: "Allow push notifications on this device",
  alertsOn: "Alerts on",
  alertsEnable: "Enable alerts",
  alertsBlocked: "Alerts blocked",
  profileSaved: "Profile saved",
  alertsOnToast: "Job alerts on",
  alertsOffToast: "Job alerts off",
  couldNotSave: "Could not save",
  jobAccepted: "Job accepted!",
  jobDeclined: "Job declined",
  respondFailed: "Failed to respond. Please try again.",
  rough: "Rough",
  trim: "Trim",
  service: "Service",
  settingsTitle: "Settings",
  pushNewJobTitle: "New job assigned",
  messages: "Messages",
  messagesEmpty: "No new job messages.",
  messagesTitle: "New jobs",
  noNewMessages: "You’re all caught up.",
  acceptAll: "Accept all",
  acceptAllCount: "Accept all ({n})",
  acceptingAll: "Accepting…",
  jobsAcceptedAll: "Accepted {n} jobs",
};

const es: Record<CrewMessageKey, string> = {
  mySchedule: "Mi horario",
  jobBoard: "Tablero de trabajos",
  jobBoardHintTeam: "Trabajos de esta semana para {team} (solo lectura)",
  jobBoardHintYou: "Trabajos de esta semana asignados a ti (solo lectura)",
  jobBoardHintFull:
    "Tablero semanal completo (solo lectura) — Actuales y Anteriores abajo son tuyos",
  current: "Actuales",
  currentHint: "Hoy y próximos — acepta o rechaza cuando te los envíen",
  previous: "Anteriores",
  previousHint: "Trabajos pasados por mes, luego semana lun–vie",
  pending: "pendientes",
  settings: "Ajustes",
  signOut: "Cerrar sesión",
  myJobs: "Mis trabajos",
  accept: "Aceptar",
  decline: "Rechazar",
  saving: "Guardando…",
  statusAccepted: "Aceptado",
  statusDeclined: "Rechazado",
  statusPending: "Pendiente",
  statusScheduled: "Programado",
  colDate: "Fecha",
  colJob: "Trabajo",
  colAddress: "Dirección",
  colAssignee: "Asignado",
  colKind: "Tipo",
  colStatus: "Estado",
  colActions: "Acciones",
  noCurrentJobs: "No hay trabajos actuales para tu equipo.",
  noPreviousJobs: "Aún no hay trabajos anteriores.",
  noJobsThisWeek: "No hay trabajos en el tablero para {who} esta semana.",
  noJobsThisWeekHint:
    "No hay trabajos en el tablero para {who} esta semana — usa Ant. / Sig. para cambiar de semana.",
  week: "Semana",
  weeksShort: "sem",
  jobsShort: "trab.",
  jobSingular: "trabajo",
  jobPlural: "trabajos",
  weekSingular: "semana",
  weekPlural: "semanas",
  prevWeek: "← Ant.",
  nextWeek: "Sig. →",
  thisWeek: "Esta semana",
  noJobsDay: "Sin trabajos",
  swipeBoardHint: "Desliza de lado para ver lun–vie",
  emptyWeekViewer:
    "No hay trabajos en el tablero esta semana. Usa Ant. / Sig. para cambiar de semana.",
  languageTitle: "Idioma",
  languageHint: "Elige inglés o español para la app de cuadrilla.",
  languageEnglish: "English",
  languageSpanish: "Español",
  chooseLanguageTitle: "Choose your language",
  chooseLanguageSubtitle: "Elige tu idioma",
  contactTitle: "Tu información de contacto",
  contactHint:
    "Manténla al día para iniciar sesión y recibir textos de trabajos. Puedes agregar teléfono o correo cuando quieras.",
  name: "Nombre",
  nameLockedHint: "Pide a un supervisor si necesitas cambiar tu nombre.",
  phone: "Teléfono",
  phoneHint:
    "Para iniciar sesión por enlace de texto y alertas de trabajos. Debe coincidir con el número que usas.",
  email: "Correo (opcional)",
  emailHint:
    "Para iniciar sesión por enlace de correo y alertas de trabajos (opcional).",
  smsConsent:
    "Acepto recibir mensajes SMS de Crew Dispatch para inicio de sesión y alertas de trabajo. La frecuencia varía. Pueden aplicar tarifas de mensajes y datos. Responde STOP para cancelar, HELP para ayuda. El consentimiento no es condición de empleo. Consulta nuestra Política de Privacidad.",
  smsConsentRequired:
    "Marca la casilla de consentimiento SMS para guardar un teléfono.",
  saveContact: "Guardar contacto",
  alertsTitle: "Alertas de trabajos",
  alertsHint:
    "Las asignaciones nuevas también van a tu teléfono y correo de arriba. Activa push para alertas en este dispositivo.",
  alertsToggle: "Permitir notificaciones push en este dispositivo",
  alertsOn: "Alertas activas",
  alertsEnable: "Activar alertas",
  alertsBlocked: "Alertas bloqueadas",
  profileSaved: "Perfil guardado",
  alertsOnToast: "Alertas activadas",
  alertsOffToast: "Alertas desactivadas",
  couldNotSave: "No se pudo guardar",
  jobAccepted: "¡Trabajo aceptado!",
  jobDeclined: "Trabajo rechazado",
  respondFailed: "No se pudo responder. Inténtalo de nuevo.",
  rough: "Rough",
  trim: "Trim",
  service: "Service",
  settingsTitle: "Ajustes",
  pushNewJobTitle: "Nuevo trabajo asignado",
  messages: "Mensajes",
  messagesEmpty: "No hay mensajes de trabajos nuevos.",
  messagesTitle: "Trabajos nuevos",
  noNewMessages: "Estás al día.",
  acceptAll: "Aceptar todos",
  acceptAllCount: "Aceptar todos ({n})",
  acceptingAll: "Aceptando…",
  jobsAcceptedAll: "Se aceptaron {n} trabajos",
};

export const CREW_MESSAGES: Record<CrewLocale, Record<CrewMessageKey, string>> =
  { en, es };

export function isCrewLocale(value: unknown): value is CrewLocale {
  return value === "en" || value === "es";
}
