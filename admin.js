/* ═══════════════════════════════════════════════════════════════════════════
   IMBRIANI NOLEGGIO - admin.js v2.7.2 (30 Ottobre 2025)
   Dashboard Admin: Prenotazioni, Conferma, Modifica, Cancellazione
   ✅ Config dinamico da config.js
   ✅ XSS Protection + Rate Limiting
   ✅ Stats calcolate da prenotazioni
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

const ADMIN_VERSION = '2.7.2';
const ADMIN_BUILD_DATE = '2025-10-30';

let adminPassword = '';
let loginAttempts = 0;
let lockoutTime = 0;
let prenotazioniCache = [];

console.log(`%c🔐 Admin Dashboard v${ADMIN_VERSION}`, 'font-size: 16px; font-weight: bold; color: #667eea;');

// =====================
// INIT
// =====================
document.addEventListener('DOMContentLoaded', () => {
  initializeAdmin();
});

function initializeAdmin() {
  const loginSection = qsId('admin-login');
  const dashboardSection = qsId('admin-dashboard');

  if (loginSection) {
    qsId('admin-password-form').addEventListener('submit', (e) => {
      e.preventDefault();
      handleAdminLogin();
    });
  }

  if (dashboardSection) {
    qsId('logout-btn').addEventListener('click', handleLogout);
    qsId('refresh-btn').addEventListener('click', caricaPrenotazioni);
    qsId('export-btn').addEventListener('click', exportPrenotazioniCSV);
    qsId('filter-stato').addEventListener('change', applicaFiltri);
    qsId('form-conferma').addEventListener('submit', handleConferma);
    qsId('form-modifica').addEventListener('submit', handleModifica);
  }

  // Check if already logged in
  const token = getFromStorage('adminToken');
  if (token) {
    mostraAdminDashboard();
    caricaPrenotazioni();
  }
}

// =====================
// LOGIN
// =====================
function handleAdminLogin() {
  const pwInput = qsId('admin-pw');
  const errorDiv = qsId('login-error');
  const lockoutDiv = qsId('lockout-message');

  errorDiv.classList.add('hidden');
  lockoutDiv.classList.add('hidden');

  // Check lockout
  const now = Date.now();
  if (lockoutTime && now - lockoutTime < FRONTEND_CONFIG.ADMIN_LOCKOUT_MINUTI * 60 * 1000) {
    const remaining = Math.ceil((FRONTEND_CONFIG.ADMIN_LOCKOUT_MINUTI * 60 * 1000 - (now - lockoutTime)) / 1000);
    showError(lockoutDiv, `⏳ Account bloccato. Riprova tra ${Math.ceil(remaining / 60)} minuti.`);
    return;
  }

  const pw = pwInput.value.trim();
  if (!pw) {
    showError(errorDiv, '❌ Inserisci password.');
    return;
  }

  // Verifica password (client-side soft check, vero controllo nel backend)
  // Per sicurezza, dovrebbe essere verificato nel backend!
  if (pw !== 'Imbriani2025+') {
    loginAttempts++;
    if (loginAttempts >= FRONTEND_CONFIG.ADMIN_MAX_TENTATIVI) {
      lockoutTime = now;
      showError(errorDiv, `❌ Troppi tentativi. Account bloccato per ${FRONTEND_CONFIG.ADMIN_LOCKOUT_MINUTI} minuti.`);
      pwInput.value = '';
      return;
    }
    showError(errorDiv, `❌ Password errata. Tentativi rimasti: ${FRONTEND_CONFIG.ADMIN_MAX_TENTATIVI - loginAttempts}`);
    pwInput.value = '';
    return;
  }

  // Login success
  loginAttempts = 0;
  adminPassword = pw;
  saveToStorage('adminToken', 'admin_token_' + Date.now());
  showToast('✅ Accesso eseguito!', 'success');
  mostraAdminDashboard();
  pwInput.value = '';
  caricaPrenotazioni();
}

function handleLogout() {
  removeFromStorage('adminToken');
  adminPassword = '';
  loginAttempts = 0;
  prenotazioniCache = [];
  showToast('👋 Logout eseguito.', 'info');
  location.reload();
}

function mostraAdminDashboard() {
  const loginSection = qsId('admin-login');
  const dashboardSection = qsId('admin-dashboard');
  if (loginSection) loginSection.classList.add('hidden');
  if (dashboardSection) dashboardSection.classList.remove('hidden');
}

// =====================
// CARICA PRENOTAZIONI
// =====================
async function caricaPrenotazioni() {
  try {
    showLoader(true);

const payload = {
      action: 'recuperaPrenotazioni',
      token: FRONTEND_CONFIG.TOKEN,
      pw: adminPassword,
      cf: '',  // ✅ CF vuoto = Admin mode
      stato: '',
      daData: '',
      aData: ''
    };


    const result = await callAPI('recuperaPrenotazioni', payload, 'POST');

    if (result.success && result.prenotazioni) {
      prenotazioniCache = result.prenotazioni;
      renderPrenotazioniTable(prenotazioniCache);
      aggiornaStatistiche(prenotazioniCache);
      showToast('✅ Prenotazioni caricate!', 'success');
    } else {
      throw new Error(result.message || 'Errore nel caricamento.');
    }

    showLoader(false);
  } catch (error) {
    showLoader(false);
    Logger.error('Errore caricamento prenotazioni: ' + error.message);
    showToast('❌ Errore: ' + error.message, 'error');
  }
}

// =====================
// RENDER TABELLA
// =====================
function renderPrenotazioniTable(prenotazioni) {
  const tbody = qsId('bookings-tbody');
  if (!tbody) return;

  if (!prenotazioni || prenotazioni.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center">Nessuna prenotazione.</td></tr>';
    return;
  }

  tbody.innerHTML = prenotazioni.map(p => {
    const statoEmoji = getStatoEmoji(p.stato);
    const statoLabel = getStatoLabel(p.stato);
    const statoColor = getStatoColor(p.stato);
    
    // ✅ FIX 1: Cliente COMPLETO (non mascherato)
    // ✅ FIX 2: Ritiro e Arrivo CON ORARI
    const ritiroConOra = `${sanitizeHTML(p.dataInizio)} ${sanitizeHTML(p.oraInizio || '08:00')}`;
    const arrivoConOra = `${sanitizeHTML(p.dataFine)} ${sanitizeHTML(p.oraFine || '18:00')}`;

    return `
      <tr>
        <td><strong>${sanitizeHTML(p.id)}</strong></td>
        <td>${sanitizeHTML(p.cliente || 'N/A')}</td>
        <td>${sanitizeHTML(p.targa)}</td>
        <td>${ritiroConOra}</td>
        <td>${arrivoConOra}</td>
        <td>€${sanitizeHTML(p.importo)}</td>
        <td>
          <span class="booking-status" style="background: ${statoColor}40; color: ${statoColor};">
            ${statoEmoji} ${statoLabel}
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 5px; flex-wrap: wrap;">
            <button class="btn btn-primary btn-sm" onclick="apriModalConferma('${sanitizeHTML(p.id)}')">📄</button>
            <button class="btn btn-info btn-sm" onclick="apriModalModifica('${sanitizeHTML(p.id)}')">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="richiediConfermaDelete('${sanitizeHTML(p.id)}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// =====================
// STATISTICHE
// =====================
function aggiornaStatistiche(prenotazioni) {
  const stats = {
    totali: prenotazioni.length,
    daConfermare: prenotazioni.filter(p => p.stato === 'Da confermare').length,
    future: prenotazioni.filter(p => p.stato === 'Futura').length,
    inCorso: prenotazioni.filter(p => p.stato === 'In corso').length,
    completate: prenotazioni.filter(p => p.stato === 'Completata').length,
  };

  qsId('stat-totali').textContent = stats.totali;
  qsId('stat-daconfermare').textContent = stats.daConfermare;
  qsId('stat-future').textContent = stats.future;
  qsId('stat-incorso').textContent = stats.inCorso;
  qsId('stat-completate').textContent = stats.completate;

  Logger.info(`Stats: Tot=${stats.totali}, DaConf=${stats.daConfermare}, Future=${stats.future}, InCorso=${stats.inCorso}, Compl=${stats.completate}`);
}

// =====================
// FILTRI
// =====================
function applicaFiltri() {
  const statoFilter = qsId('filter-stato').value;

  if (!statoFilter) {
    renderPrenotazioniTable(prenotazioniCache);
  } else {
    const filtered = prenotazioniCache.filter(p => p.stato === statoFilter);
    renderPrenotazioniTable(filtered);
  }
}

// =====================
// MODAL CONFERMA
// =====================
function apriModalConferma(idPrenotazione) {
  const prenotazione = prenotazioniCache.find(p => p.id === idPrenotazione);
  if (!prenotazione) {
    showToast('❌ Prenotazione non trovata.', 'error');
    return;
  }

  qsId('conferma-id').value = sanitizeHTML(prenotazione.id);
  qsId('conferma-cliente').value = sanitizeHTML(prenotazione.cliente || '');
  qsId('conferma-targa').value = sanitizeHTML(prenotazione.targa || '');
  qsId('conferma-periodo').value = sanitizeHTML(formattaPeriodo(prenotazione.dataInizio, prenotazione.dataFine, prenotazione.oraInizio, prenotazione.oraFine));
  
  // ✅ IMPORTO READONLY - Calcolato da backend
  const giorni = calcolaGiorni(prenotazione.dataInizio, prenotazione.dataFine);
  const importoCalcolato = Math.round(giorni * (prenotazione.tariffaGiorno || 100));
  qsId('conferma-importo').value = importoCalcolato;
  
  qsId('conferma-note').value = '';

  openModal('modal-conferma');
}

async function handleConferma(e) {
  e.preventDefault();

  const idPrenotazione = qsId('conferma-id').value;
  const importo = qsId('conferma-importo').value;
  const note = qsId('conferma-note').value;
  
  // 🔴 ESTRAI CF DALLA RIGA DELLA TABELLA
  const prenotazione = prenotazioniCache.find(p => p.id === idPrenotazione);
  const cf = prenotazione?.cf || ''; // Prendi CF dalla cache

  try {
    showLoader(true);

    // Step 1: Aggiorna prenotazione a "Confermata"
    const updatePayload = {
      action: 'manageBooking',
      token: FRONTEND_CONFIG.TOKEN,
      pw: adminPassword,
      mode: 'update',
      cf: cf,  // ✅ ORA HA IL CF!
      idPrenotazione: idPrenotazione,
      stato: 'Confermata',
      note: note
    };

    const updateResult = await callAPI('manageBooking', updatePayload, 'POST');
    if (!updateResult.success) throw new Error(updateResult.message);

    // Step 2: Genera PDF
    const pdfPayload = {
      action: 'generatePDF',
      token: FRONTEND_CONFIG.TOKEN,
      pw: adminPassword,
      idPrenotazione: idPrenotazione,
      cf: cf  // ✅ ORA HA IL CF!
    };

    const pdfResult = await callAPI('generatePDF', pdfPayload, 'POST');
    if (pdfResult.success) {
      showToast(`✅ Prenotazione confermata! PDF: ${pdfResult.nomeFile}`, 'success');
      const msgDiv = qsId('conferma-message');
      msgDiv.className = 'alert alert-success';
      msgDiv.innerHTML = `✅ PDF Generato: <a href="${pdfResult.pdfUrl}" target="_blank">${pdfResult.nomeFile}</a>`;
      msgDiv.classList.remove('hidden');
    } else {
      showToast(`⚠️ Prenotazione confermata, ma PDF non generato: ${pdfResult.message}`, 'warning');
    }

    closeModal('modal-conferma');
    await caricaPrenotazioni();
    showLoader(false);
  } catch (error) {
    showLoader(false);
    Logger.error('Errore conferma: ' + error.message);
    showToast('❌ Errore: ' + error.message, 'error');
  }
}

// =====================
// MODAL MODIFICA
// =====================
function apriModalModifica(idPrenotazione) {
  const prenotazione = prenotazioniCache.find(p => p.id === idPrenotazione);
  if (!prenotazione) {
    showToast('❌ Prenotazione non trovata.', 'error');
    return;
  }

  qsId('modifica-id').value = sanitizeHTML(prenotazione.id);
  qsId('modifica-stato').value = prenotazione.stato || 'Da confermare';
  qsId('modifica-nota').value = sanitizeHTML(prenotazione.note || '');

  openModal('modal-modifica');
}

async function handleModifica(e) {
  e.preventDefault();

  const idPrenotazione = qsId('modifica-id').value;
  const stato = qsId('modifica-stato').value;
  const nota = qsId('modifica-nota').value;

  try {
    showLoader(true);

    const payload = {
      action: 'manageBooking',
      token: FRONTEND_CONFIG.TOKEN,
      pw: adminPassword,
      mode: 'update',
      cf: '',
      idPrenotazione: idPrenotazione,
      stato: stato,
      note: nota
    };

    const result = await callAPI('manageBooking', payload, 'POST');

    showLoader(false);

    if (result.success) {
      showToast('✅ Prenotazione modificata!', 'success');
      closeModal('modal-modifica');
      await caricaPrenotazioni();
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    showLoader(false);
    Logger.error('Errore modifica: ' + error.message);
    showToast('❌ Errore: ' + error.message, 'error');
  }
}

// =====================
// CANCELLAZIONE
// =====================
function richiediConfermaDelete(idPrenotazione) {
  if (confirm('⚠️ Sei sicuro di voler eliminare questa prenotazione? Questa azione non può essere annullata.')) {
    deletePrenotazione(idPrenotazione);
  }
}

async function deletePrenotazione(idPrenotazione) {
  try {
    showLoader(true);

    const payload = {
      action: 'manageBooking',
      token: FRONTEND_CONFIG.TOKEN,
      pw: adminPassword,
      mode: 'delete',
      cf: '',
      idPrenotazione: idPrenotazione
    };

    const result = await callAPI('manageBooking', payload, 'POST');

    showLoader(false);

    if (result.success) {
      showToast('✅ Prenotazione eliminata!', 'success');
      await caricaPrenotazioni();
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    showLoader(false);
    Logger.error('Errore cancellazione: ' + error.message);
    showToast('❌ Errore: ' + error.message, 'error');
  }
}

// =====================
// EXPORT CSV
// =====================
function exportPrenotazioniCSV() {
  if (prenotazioniCache.length === 0) {
    showToast('❌ Nessuna prenotazione da esportare.', 'warning');
    return;
  }

  const data = prenotazioniCache.map(p => ({
    ID: p.id,
    Cliente: p.cliente || '',
    Targa: p.targa || '',
    DataInizio: p.dataInizio || '',
    DataFine: p.dataFine || '',
    Importo: p.importo || '',
    Stato: p.stato || '',
    Note: p.note || ''
  }));

  downloadCSV(data, `prenotazioni_${new Date().toISOString().split('T')[0]}.csv`);
  showToast('✅ CSV esportato!', 'success');
}

// =====================
// HELPERS
// =====================
function showError(element, message) {
  if (element) {
    element.innerHTML = message;
    element.classList.remove('hidden');
  }
}

function sanitizeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function maskNome(nome) {
  if (!nome) return '';
  const words = String(nome).split(' ');
  return words.map(w => w.length > 3 ? w.substring(0, 3) + '***' : w).join(' ');
}
// =====================
// VALIDATION HELPERS
// =====================
function isValidDate(dateStr) {
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}

function getDaysApart(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function canModifyBooking(bookingDate) {
  const today = new Date();
  const booking = new Date(bookingDate);
  const daysUntil = getDaysApart(today, booking);
  return daysUntil > FRONTEND_CONFIG.GG_MODIFICA_MIN;
}

// =====================
// BUTTON STYLES (SMALL)
// =====================
const style = document.createElement('style');
style.innerHTML = `
  .btn-sm {
    padding: 6px 10px;
    font-size: 0.8rem;
  }

  .btn-primary.btn-sm:hover {
    background: #005f11;
  }

  .btn-info.btn-sm:hover {
    background: #138496;
  }

  .btn-danger.btn-sm:hover {
    background: #c82333;
  }

  .modal-message {
    margin-top: 15px;
    padding: 10px;
    border-radius: 6px;
    font-size: 0.9rem;
  }
`;
document.head.appendChild(style);

// =====================
// FILTRA PER STATO (clic stat card)
// =====================
function filtraPer(stato) {
  if (stato === 'Totali') {
    // Mostra TUTTI
    qsId('filter-stato').value = '';
    renderPrenotazioniTable(prenotazioniCache);
    Logger.info('Filtro: TUTTI');
  } else {
    // Filtra per stato
    qsId('filter-stato').value = stato;
    applicaFiltri();
    Logger.info('Filtro: ' + stato);
  }
}

console.log('%c✅ admin.js v' + ADMIN_VERSION + ' caricato', 'color: #28a745; font-weight: bold;');
