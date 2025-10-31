/* ═══════════════════════════════════════════════════════════════════════════
   IMBRIANI NOLEGGIO - config.js v1.0
   Configurazione Centralizzata Frontend
   Creato: 30 Ottobre 2025
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

// =====================
// API CONFIGURATION
// =====================
const FRONTEND_CONFIG = {
  // ✅ API Deployment
  API_URL: 'https://script.google.com/macros/s/AKfycbx8vOsfdliS4e5odoRMkvCwaWY7SowSkgtW0zTuvqDIu4R99sUEixlLSW7Y9MyvNWk/exec',
  
  // Auth Token
  TOKEN: 'ImbrianiToken2025v5',
  
  // API Endpoints mapping
  endpoints: {
    login: '?action=login',
    datiCliente: '?action=datiCliente',
    recuperaPrenotazioni: '?action=recuperaPrenotazioni',
    disponibilita: '?action=disponibilita',
    aggiornaProfilo: '?action=aggiornaProfilo',
    manageBooking: '?action=manageBooking',
    generatePDF: '?action=generatePDF',
    adminPrenotazioni: '?action=adminPrenotazioni',
  },
  
  // Timeouts e Retry
  FETCH_TIMEOUT_MS: 30000,
  RETRY_MAX: 3,
  RETRY_BACKOFF_BASE: 2,
  
  // Rate Limiting Client
  MAX_REQUESTS_PER_MINUTE: 10,
  
  // Prezzi (fallback)
  PREZZO_ORA: 50,
  BASE_IMPORTO: 200,
  PREZZO_GIORNO_DEFAULT: 100,
  
  // Validazioni
  GG_MODIFICA_MIN: 11,
  GG_PRENOTAZIONE_MIN: 7,
  MAX_GIORNI_PRENOTAZIONE: 30,
  
  // Admin Panel
  ADMIN_LOCKOUT_MINUTI: 15,
  ADMIN_MAX_TENTATIVI: 5,
  
  // UI/UX
  TOAST_DURATION_MS: 3000,
  MODAL_ANIMATION_MS: 300,
  DEBOUNCE_MS: 500,
  
  // Debug
  DEBUG: false,
  LOG_LEVEL: 'info',
};

// =====================
// EMOJI & LABELS
// =====================
const STATE_LABELS = {
  'Da confermare': { emoji: '⏳', label: 'Da Confermare', color: '#ffc107' },
  'Futura': { emoji: '📅', label: 'Futura', color: '#17a2b8' },
  'In corso': { emoji: '🚐', label: 'In Corso', color: '#28a745' },
  'Completata': { emoji: '✅', label: 'Completata', color: '#6c757d' },
  'Confermata': { emoji: '✅', label: 'Confermata', color: '#28a745' },
};

const VEHICLE_TYPES = {
  'Fiat Ducato': '🚐',
  'Renault Trafic': '🚐',
  'Mercedes': '🚐',
};

// =====================
// LOCALE & FORMATTING
// =====================
const LOCALE_CONFIG = {
  timezone: 'Europe/Rome',
  dateFormat: 'dd/mm/yyyy',
  timeFormat: 'HH:mm',
  currency: 'EUR',
};

// =====================
// ERROR MESSAGES
// =====================
const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Errore di connessione. Riprova fra poco.',
  API_ERROR: 'Errore del server. Contatta supporto.',
  TIMEOUT: 'Richiesta scaduta. Riprova.',
  INVALID_CF: 'Codice fiscale non valido.',
  INVALID_DATE: 'Data non valida.',
  NO_AVAILABILITY: 'Nessun veicolo disponibile in quel periodo.',
  BOOKING_EXISTS: 'Prenotazione già presente.',
  UNAUTHORIZED: 'Non autorizzato.',
  FORBIDDEN: 'Accesso negato.',
  NOT_FOUND: 'Risorsa non trovata.',
  UNKNOWN: 'Errore sconosciuto.',
};

const SUCCESS_MESSAGES = {
  BOOKING_CREATED: '✅ Prenotazione creata con successo!',
  BOOKING_UPDATED: '✅ Prenotazione aggiornata!',
  BOOKING_DELETED: '✅ Prenotazione eliminata!',
  PROFILE_UPDATED: '✅ Profilo aggiornato!',
  PDF_GENERATED: '✅ PDF generato!',
  LOGIN_OK: '✅ Accesso eseguito!',
};

// =====================
// LOGGER UTILITY
// =====================
const Logger = {
  debug: (msg) => { if (FRONTEND_CONFIG.DEBUG && FRONTEND_CONFIG.LOG_LEVEL === 'debug') console.log('🔍', msg); },
  info: (msg) => { if (['debug', 'info'].includes(FRONTEND_CONFIG.LOG_LEVEL)) console.log('ℹ️', msg); },
  warn: (msg) => { console.warn('⚠️', msg); },
  error: (msg) => { console.error('❌', msg); },
};

console.log(`%c🎉 Imbriani Noleggio Frontend v5.4.0`, 'font-size: 14px; font-weight: bold; color: #007f17;');
