/* ═══════════════════════════════════════════════════════════════════════════
   IMBRIANI NOLEGGIO - scripts.js v5.4.0 (30 Ottobre 2025)
   Frontend Wizard Prenotazioni + Area Personale
   ✅ Fetch with Retry + Token sicuro
   ✅ Form validation migliorata
   ✅ Multi-driver support (3 autisti)
   ✅ PDF generation con retry
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

const VERSION = '5.4.0';
const BUILD_DATE = '2025-10-30';

let clienteCorrente = null;
let prenotazioniUtente = [];
let step_attuale = 1;
let booking_data = {};
let selectedBookingId = null;

console.log(`%c🎉 Imbriani Noleggio v${VERSION}`, 'font-size: 14px; font-weight: bold; color: #007f17;');

// =====================
// INIT
// =====================
document.addEventListener('DOMContentLoaded', () => {
  initializeUI();
  checkExistingSession();
});

function initializeUI() {
  const loginForm = qsId('login-form');
  const newBookingBtn = qsId('new-booking-btn');

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleLogin();
    });
  }

  if (newBookingBtn) {
    newBookingBtn.addEventListener('click', () => {
      showStep('step-1-anagrafica');
    });
  }
}

function checkExistingSession() {
  const savedCF = getFromStorage('currentCF');
  if (savedCF) {
    qsId('cf-input').value = savedCF;
    Logger.info('CF precedente trovato: ' + maskCF(savedCF));
  }
}

// =====================
// LOGIN
// =====================
async function handleLogin() {
  const cfInput = qsId('cf-input');
  const cf = formatCF(cfInput.value);
  const errorDiv = qsId('login-error');

  errorDiv.classList.add('hidden');

  if (!isValidCF(cf)) {
    showError(errorDiv, '❌ ' + ERROR_MESSAGES.INVALID_CF);
    return;
  }

  try {
    showLoader(true);

    const payload = {
      action: 'login',
      token: FRONTEND_CONFIG.TOKEN,
      cf: cf
    };

    const result = await callAPI('login', payload, 'POST');

    showLoader(false);

    if (result.success && result.data) {
      clienteCorrente = result.data;
      saveToStorage('currentCF', cf);
      saveToStorage('clienteData', JSON.stringify(clienteCorrente));
      
      showToast(SUCCESS_MESSAGES.LOGIN_OK, 'success');
      caricaPrenotazioniPersonali(cf);
      mostraAreaPersonale();
    } else {
      throw new Error(result.message || ERROR_MESSAGES.API_ERROR);
    }
  } catch (error) {
    showLoader(false);
    Logger.error('Login error: ' + error.message);
    showError(errorDiv, '❌ ' + error.message);
  }
}

// =====================
// CARICA PRENOTAZIONI PERSONALI
// =====================
async function caricaPrenotazioniPersonali(cf) {
  try {
    const payload = {
      action: 'recuperaPrenotazioni',
      token: FRONTEND_CONFIG.TOKEN,
      cf: cf,
      stato: '',
      daData: '',
      aData: ''
    };

    const result = await callAPI('recuperaPrenotazioni', payload, 'POST');

    if (result.success && result.prenotazioni) {
      prenotazioniUtente = result.prenotazioni;
      Logger.info('✅ Caricate ' + prenotazioniUtente.length + ' prenotazioni');
      renderPrenotazioniList();
    } else {
      prenotazioniUtente = [];
      renderPrenotazioniList();
    }
  } catch (error) {
    Logger.error('Errore caricamento prenotazioni: ' + error.message);
    prenotazioniUtente = [];
    renderPrenotazioniList();
  }
}

// =====================
// AREA PERSONALE
// =====================
function mostraAreaPersonale() {
  const loginSection = qsId('login-section');
  const wizardSection = qsId('wizard-section');
  const personalSection = qsId('personal-area-section');

  if (loginSection) loginSection.classList.add('hidden');
  if (wizardSection) wizardSection.classList.add('hidden');
  if (personalSection) {
    personalSection.classList.remove('hidden');
    renderPersonalArea();
  }
}

function renderPersonalArea() {
  const personalSection = qsId('personal-area-section');
  if (!personalSection) return;

  const cliente = clienteCorrente;
  const html = `
    <div class="personal-area">
      <div class="personal-header">
        <div>
          <h2>👤 ${cliente.cognome} ${cliente.nome}</h2>
          <p style="opacity: 0.9;">CF: ${maskCF(cliente.cf)}</p>
        </div>
        <button onclick="handleLogout()" class="btn btn-secondary">🚪 Logout</button>
      </div>

      <div class="personal-tabs">
        <button class="tab-btn active" onclick="switchTab('prenotazioni')">📋 Le Mie Prenotazioni</button>
        <button class="tab-btn" onclick="switchTab('dati')">👤 I Miei Dati</button>
        <button class="tab-btn" onclick="switchTab('patente')">🚘 Patente</button>
        <button class="tab-btn" onclick="switchTab('nuova')">➕ Nuova Prenotazione</button>
      </div>

      <!-- TAB: Prenotazioni -->
      <div id="tab-prenotazioni" class="tab-content active">
        <h3>📋 Le Mie Prenotazioni</h3>
        <div id="prenotazioni-list"></div>
      </div>

      <!-- TAB: Dati -->
      <div id="tab-dati" class="tab-content">
        <h3>👤 I Miei Dati Anagrafici</h3>
        <div class="booking-details">
          <div class="detail-item">
            <span class="detail-label">Nome:</span>
            <span class="detail-value">${sanitizeHTML(cliente.nome)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Cognome:</span>
            <span class="detail-value">${sanitizeHTML(cliente.cognome || 'N/A')}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Data Nascita:</span>
            <span class="detail-value">${sanitizeHTML(cliente.dataNascita || 'N/A')}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Luogo Nascita:</span>
            <span class="detail-value">${sanitizeHTML(cliente.luogoNascita || 'N/A')}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Comune Residenza:</span>
            <span class="detail-value">${sanitizeHTML(cliente.comuneResidenza || 'N/A')}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Via Residenza:</span>
            <span class="detail-value">${sanitizeHTML(cliente.viaResidenza || 'N/A')}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Email:</span>
            <span class="detail-value">${sanitizeHTML(cliente.email || 'N/A')}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Cellulare:</span>
            <span class="detail-value">${sanitizeHTML(cliente.cellulare || 'N/A')}</span>
          </div>
        </div>
        <button onclick="switchTab('nuova')" class="btn btn-primary mt-20">✏️ Modifica Dati</button>
      </div>

      <!-- TAB: Patente -->
      <div id="tab-patente" class="tab-content">
        <h3>🚘 Informazioni Patente</h3>
        <div class="booking-details">
          <div class="detail-item">
            <span class="detail-label">Numero Patente:</span>
            <span class="detail-value">${sanitizeHTML(cliente.numeroPatente || 'N/A')}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Scadenza Patente:</span>
            <span class="detail-value">
              ${cliente.scadenzaPatente ? sanitizeHTML(cliente.scadenzaPatente) : 'N/A'}
              ${cliente.scadenzaPatente && new Date(cliente.scadenzaPatente) < new Date() ? '<span class="badge badge-danger">❌ SCADUTA</span>' : ''}
            </span>
          </div>
        </div>
      </div>

      <!-- TAB: Nuova Prenotazione -->
      <div id="tab-nuova" class="tab-content">
        <h3>➕ Nuova Prenotazione</h3>
        <div id="wizard-container"></div>
      </div>
    </div>
  `;

  personalSection.innerHTML = html;
  renderPrenotazioniList();
  renderWizardInPersonalArea();
}

function renderPrenotazioniList() {
  const container = qsId('prenotazioni-list');
  if (!container) return;

  if (prenotazioniUtente.length === 0) {
    container.innerHTML = '<p class="text-muted">Non hai prenotazioni.</p>';
    return;
  }

  container.innerHTML = prenotazioniUtente.map(p => {
    const statoEmoji = getStatoEmoji(p.stato);
    const statoLabel = getStatoLabel(p.stato);
    const statoColor = getStatoColor(p.stato);

    return `
      <div class="booking-card">
        <div class="booking-header">
          <span class="booking-id">${sanitizeHTML(p.id)}</span>
          <span class="booking-status" style="background: ${statoColor}40; color: ${statoColor};">
            ${statoEmoji} ${statoLabel}
          </span>
        </div>
        <div class="booking-details">
          <div class="detail-item">
            <span class="detail-label">Veicolo:</span>
            <span class="detail-value">🚐 ${sanitizeHTML(p.targa || 'N/A')}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Ritiro:</span>
            <span class="detail-value">${sanitizeHTML(p.dataInizio)} ${sanitizeHTML(p.oraInizio)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Restituzione:</span>
            <span class="detail-value">${sanitizeHTML(p.dataFine)} ${sanitizeHTML(p.oraFine)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">💰 Importo:</span>
            <span class="detail-value">€${sanitizeHTML(p.importo || 'N/A')}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Destinazione:</span>
            <span class="detail-value">${sanitizeHTML(p.destinazione || 'Non specificata')}</span>
          </div>
        </div>
        <div class="booking-actions">
          ${p.stato === 'Da confermare' ? `<button onclick="modificaPrenotazione('${sanitizeHTML(p.id)}')" class="btn btn-primary btn-sm">✏️ Modifica</button>` : ''}
          ${p.stato === 'Da confermare' || (new Date(p.dataInizio) - new Date() > 7*24*60*60*1000) ? `<button onclick="richiediConfermaDeleteBooking('${sanitizeHTML(p.id)}')" class="btn btn-danger btn-sm">🗑️ Cancella</button>` : ''}
          ${p.stato !== 'Da confermare' && p.dataContratto ? `<button onclick="downloadPDF('${sanitizeHTML(p.id)}')" class="btn btn-info btn-sm">📄 PDF</button>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function renderWizardInPersonalArea() {
  const container = qsId('wizard-container');
  if (!container) return;

  container.innerHTML = `
    <div class="wizard-container">
      <div class="wizard-progress">
        <div class="wizard-progress-bar" style="width: 0%"></div>
      </div>
      <div class="wizard-steps" id="wizard-steps-container"></div>
    </div>
  `;

  renderWizardSteps();
}

// =====================
// MODIFICA PRENOTAZIONE
// =====================
function modificaPrenotazione(bookingId) {
  const booking = prenotazioniUtente.find(b => b.id === bookingId);
  if (!booking) return;

  const dataRitiro = new Date(booking.dataInizio);
  const oggi = new Date();
  const giorni = Math.floor((dataRitiro - oggi) / (1000*60*60*24));

  if (giorni < FRONTEND_CONFIG.GG_MODIFICA_MIN) {
    showToast(`❌ Non puoi modificare: mancano ${giorni} giorni. Minimo ${FRONTEND_CONFIG.GG_MODIFICA_MIN} giorni.`, 'warning');
    return;
  }

  booking_data = { ...booking };
  selectedBookingId = bookingId;
  switchTab('nuova');
  Logger.info('Modifica prenotazione: ' + bookingId);
}

function richiediConfermaDeleteBooking(bookingId) {
  if (confirm('⚠️ Sei sicuro di voler cancellare questa prenotazione?')) {
    deleteBooking(bookingId);
  }
}

async function deleteBooking(bookingId) {
  try {
    showLoader(true);

    const payload = {
      action: 'manageBooking',
      token: FRONTEND_CONFIG.TOKEN,
      mode: 'delete',
      cf: clienteCorrente.cf,
      idPrenotazione: bookingId
    };

    const result = await callAPI('manageBooking', payload, 'POST');

    showLoader(false);

    if (result.success) {
      showToast(SUCCESS_MESSAGES.BOOKING_DELETED, 'success');
      await caricaPrenotazioniPersonali(clienteCorrente.cf);
      renderPrenotazioniList();
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    showLoader(false);
    showToast('❌ Errore: ' + error.message, 'error');
  }
}

// =====================
// TABS
// =====================
function switchTab(tabName) {
  qsAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  qsAll('.tab-content').forEach(content => content.classList.remove('active'));

  const btn = document.querySelector(`[onclick="switchTab('${tabName}')"]`);
  if (btn) btn.classList.add('active');

  const content = qsId(`tab-${tabName}`);
  if (content) {
    content.classList.add('active');
    if (tabName === 'nuova') {
      renderWizardSteps();
    }
  }
}

// =====================
// LOGOUT
// =====================
function handleLogout() {
  removeFromStorage('currentCF');
  removeFromStorage('clienteData');
  removeFromStorage('bookingData');
  clienteCorrente = null;
  prenotazioniUtente = [];
  booking_data = {};
  selectedBookingId = null;
  showToast('👋 Logout eseguito.', 'info');
  location.reload();
}

// =====================
// WIZARD RENDERING
// =====================
function renderWizardSteps() {
  const container = qsId('wizard-steps-container') || qsId('wizard-section');
  if (!container) return;

  if (!qsId('wizard-steps-container')) {
    container.innerHTML = `<div class="wizard-container"><div class="wizard-steps" id="wizard-steps-container"></div></div>`;
  }

  const stepsContainer = qsId('wizard-steps-container');
  stepsContainer.innerHTML = getWizardHTML();

  // Event listeners
  setTimeout(() => {
    attachWizardEvents();
  }, 100);
}

function getWizardHTML() {
  return `
    <div class="wizard-step active" id="step-1">
      <h2>📅 Quando vuoi noleggiare?</h2>
      <form class="form">
        <div class="form-group">
          <label>Data Ritiro:</label>
          <input type="date" id="data-ritiro" required>
        </div>
        <div class="form-group">
          <label>Ora Ritiro:</label>
          <select id="ora-ritiro" required>
            <option value="08:00">08:00</option>
            <option value="12:00">12:00</option>
            <option value="16:00">16:00</option>
            <option value="20:00">20:00</option>
          </select>
        </div>
        <div class="form-group">
          <label>Data Restituzione:</label>
          <input type="date" id="data-restituzione" required>
        </div>
        <div class="form-group">
          <label>Ora Restituzione:</label>
          <select id="ora-restituzione" required>
            <option value="08:00">08:00</option>
            <option value="12:00">12:00</option>
            <option value="16:00">16:00</option>
            <option value="20:00">20:00</option>
          </select>
        </div>
        <div class="form-group">
          <label>Destinazione:</label>
          <input type="text" id="destinazione" placeholder="Es: Roma, Tivoli, etc.">
        </div>
        <div class="wizard-actions">
          <button type="button" class="btn btn-secondary" onclick="handleLogout()">❌ Annulla</button>
          <button type="button" class="btn btn-primary" onclick="procediStep1()">Avanti →</button>
        </div>
      </form>
    </div>

    <div class="wizard-step" id="step-2">
      <h2>🚗 Quale pulmino?</h2>
      <div id="veicoli-list"></div>
      <div class="wizard-actions">
        <button type="button" class="btn btn-secondary" onclick="tornaStep(1)">← Indietro</button>
        <button type="button" class="btn btn-primary" id="btn-continua-step2" disabled onclick="procediStep2()">Seleziona e continua →</button>      </div>
    </div>

    <div class="wizard-step" id="step-3">
      <h2>👤 Chi guida?</h2>
      <div id="autisti-form"></div>
      <div class="wizard-actions">
        <button type="button" class="btn btn-secondary" onclick="tornaStep(2)">← Indietro</button>
        <button type="button" class="btn btn-primary" onclick="procediStep3()">Avanti →</button>
      </div>
    </div>

    <div class="wizard-step" id="step-4">
      <h2>✅ Conferma Prenotazione</h2>
      <div id="riepilogo-prenotazione"></div>
      <div class="wizard-actions">
        <button type="button" class="btn btn-secondary" onclick="tornaStep(1)">← Indietro</button>
        <button type="button" class="btn btn-success" onclick="confermaPrenotazione()">📝 Conferma Prenotazione</button>
      </div>
    </div>
  `;
}

function attachWizardEvents() {
  // Step 1 auto-fill da booking_data se modifica
  if (selectedBookingId && booking_data.dataInizio) {
    const [year, month, day] = booking_data.dataInizio.split('/').reverse();
    qsId('data-ritiro').value = `${year}-${month}-${day}`;
    qsId('ora-ritiro').value = booking_data.oraInizio || '08:00';
    
    const [year2, month2, day2] = booking_data.dataFine.split('/').reverse();
    qsId('data-restituzione').value = `${year2}-${month2}-${day2}`;
    qsId('ora-restituzione').value = booking_data.oraFine || '18:00';
    qsId('destinazione').value = booking_data.destinazione || '';
  }
}

async function procediStep1() {
  const dataRitiro = qsId('data-ritiro').value;
  const dataRestituzione = qsId('data-restituzione').value;
  const oraRitiro = qsId('ora-ritiro').value;
  const oraRestituzione = qsId('ora-restituzione').value;
  const destinazione = qsId('destinazione').value;

  if (!dataRitiro || !dataRestituzione) {
    showToast('❌ Seleziona date valide.', 'error');
    return;
  }

  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  const ritiro = new Date(dataRitiro);
  if (ritiro < oggi) {
    showToast('❌ Data ritiro non può essere nel passato.', 'error');
    return;
  }

    const giorni = Math.round((new Date(dataRestituzione) - new Date(dataRitiro)) / (1000*60*60*24));
if (giorni < 1) {
  showToast('❌ La restituzione deve essere dopo il ritiro.', 'error');
  return;
}

  booking_data.dataRitiro = dataRitiro;
  booking_data.dataRestituzione = dataRestituzione;
  booking_data.oraRitiro = oraRitiro;
  booking_data.oraRestituzione = oraRestituzione;
  booking_data.destinazione = destinazione;

  showStep('step-2');
  await caricaVeicoli(dataRitiro, dataRestituzione);
}

async function caricaVeicoli(dataInizio, dataFine) {
  try {
    showLoader(true);

    const payload = {
      action: 'disponibilita',
      token: FRONTEND_CONFIG.TOKEN,
      dataInizio: formattaDataIT(new Date(dataInizio)),
      dataFine: formattaDataIT(new Date(dataFine)),
      oraInizio: '08:00',
      oraFine: '18:00'
    };

    const result = await callAPI('disponibilita', payload, 'POST');
    
    Logger.info('🔍 API Response:', result);
    Logger.info('📦 Disponibili count:', result.disponibili ? result.disponibili.length : 'NULL/UNDEFINED');

    showLoader(false);

    if (result.success && result.disponibili) {
      const container = qsId('veicoli-list');
      container.innerHTML = result.disponibili.map(v => `
        <div class="booking-card" onclick="selezionaVeicolo('${sanitizeHTML(v.targa)}', ${v.tariffaGiorno}, ${v.importo})" style="cursor: pointer;">
          <div class="booking-header">
            <span class="booking-id">🚐 ${sanitizeHTML(v.marca + ' ' + v.modello)}</span>
            <!-- BADGE PREZZO NASCOSTO -->
          </div>
          <div class="booking-details">
            <div class="detail-item">
              <span class="detail-label">Targa:</span>
              <span class="detail-value">${sanitizeHTML(v.targa)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Posti:</span>
              <span class="detail-value">${v.posti}</span>
            </div>
            <div class="detail-item">
              <!-- TARIFA NASCOSTA -->
              <!-- PREZZO NASCOSTO -->
            </div>
          </div>
        </div>
      `).join('');
    } else {
      qsId('veicoli-list').innerHTML = '<p class="text-muted">❌ Nessun veicolo disponibile.</p>';
    }
  } catch (error) {
    showLoader(false);
    showToast('❌ Errore caricamento veicoli: ' + error.message, 'error');
  }
}

function selezionaVeicolo(targa, tariffaGiorno, importo) {
  booking_data.targa = targa;
  booking_data.tariffaGiorno = tariffaGiorno;
  booking_data.importo = importo;
  qsId('btn-continua-step2').disabled = false;
  showToast(`✅ ${targa} selezionato!`, 'success');
}

function procediStep2() {
  if (!booking_data.targa) {
    showToast('❌ Seleziona un veicolo.', 'error');
    return;
  }
  showStep('step-3');
  renderAutistiForm();
}

// 🔴 Funzione per convertire date
function formatDateToInput(dateStr) {
  if (!dateStr) return '';
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
  if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  }
  return '';
}

// =====================
// STEP 3 - CHI GUIDA?
// =====================

function renderAutistiForm() {
  Logger.info('📝 Renderizzazione form autisti con Card');
  
  const step3 = qsId('step-3');
  if (!step3) {
    Logger.error('❌ STEP 3 non trovato!');
    return;
  }
  
  // HTML FORM AUTISTI
  step3.innerHTML = `
    <h2>👥 Chi guida?</h2>
    
    <!-- SEZIONE 1: SELEZIONE AUTISTI CON CARD -->
    <div class="drivers-selector" style="margin-bottom: 30px;">
      <label style="display: block; margin-bottom: 15px; font-weight: 600; font-size: 1.1rem;">📊 Quanti autisti desideri?</label>
      <div class="drivers-cards" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px;">
        <div class="driver-card active" data-drivers="1" style="background: #007f17; color: white; padding: 20px; border-radius: 8px; text-align: center; cursor: pointer; transition: all 0.3s;">
          <div class="card-number" style="font-size: 2.5rem; font-weight: bold;">1</div>
          <div class="card-label" style="font-size: 1rem;">Autista</div>
        </div>
        <div class="driver-card" data-drivers="2" style="background: #f8f9fa; border: 2px solid #dee2e6; padding: 20px; border-radius: 8px; text-align: center; cursor: pointer; transition: all 0.3s;">
          <div class="card-number" style="font-size: 2.5rem; font-weight: bold; color: #007f17;">2</div>
          <div class="card-label" style="font-size: 1rem; color: #666;">Autisti</div>
        </div>
        <div class="driver-card" data-drivers="3" style="background: #f8f9fa; border: 2px solid #dee2e6; padding: 20px; border-radius: 8px; text-align: center; cursor: pointer; transition: all 0.3s;">
          <div class="card-number" style="font-size: 2.5rem; font-weight: bold; color: #007f17;">3</div>
          <div class="card-label" style="font-size: 1rem; color: #666;">Autisti</div>
        </div>
      </div>
    </div>

    <!-- SEZIONE 2: FORM AUTISTA 1 (SEMPRE VISIBILE) -->
    <div class="driver-form" id="driver-form-1" style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h3 style="color: #007f17; margin-bottom: 20px;">🚗 Autista 1 (Principale) *</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
        <div>
          <label style="display: block; margin-bottom: 5px; font-weight: 600;">Nome *</label>
          <input type="text" id="driver1_nome" placeholder="Es: Mario" required style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px;">
        </div>
        <div>
          <label style="display: block; margin-bottom: 5px; font-weight: 600;">Cognome *</label>
          <input type="text" id="driver1_cognome" placeholder="Es: Rossi" required style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px;">
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
        <div>
          <label style="display: block; margin-bottom: 5px; font-weight: 600;">Codice Fiscale *</label>
          <input type="text" id="driver1_cf" placeholder="Es: RSSMRA85A10H501J" maxlength="16" required style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px;">
        </div>
        <div>
          <label style="display: block; margin-bottom: 5px; font-weight: 600;">Data Nascita *</label>
          <input type="date" id="driver1_datanascita" required style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px;">
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
        <div>
          <label style="display: block; margin-bottom: 5px; font-weight: 600;">Indirizzo *</label>
          <input type="text" id="driver1_indirizzo" placeholder="Es: Via Roma 123" required style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px;">
        </div>
        <div>
          <label style="display: block; margin-bottom: 5px; font-weight: 600;">Città *</label>
          <input type="text" id="driver1_citta" placeholder="Es: Roma" required style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px;">
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
        <div>
          <label style="display: block; margin-bottom: 5px; font-weight: 600;">Provincia (MAX 2 maiuscole) *</label>
           
          <input type="text" id="driver1_provincia" placeholder="RM" maxlength="2" pattern="[A-Z]{2}" style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px; text-transform: uppercase;" required>
        </div>
        <div>
  <label style="display: block; margin-bottom: 5px; font-weight: 600;">Civico *</label>
  <input type="text" id="driver1_civico" placeholder="N° civico" maxlength="10" required style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px;">
</div>
        <div>
          <label style="display: block; margin-bottom: 5px; font-weight: 600;">Cellulare *</label>
          <input type="tel" id="driver1_cellulare" placeholder="Es: 3201234567" required style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px;">
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
        <div>
          <label style="display: block; margin-bottom: 5px; font-weight: 600;">Numero Patente *</label>
          <input type="text" id="driver1_patente_numero" placeholder="Es: AB123456" required style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px;">
        </div>
        <div>
          <label style="display: block; margin-bottom: 5px; font-weight: 600;">Data Inizio Patente *</label>
          <input type="date" id="driver1_patente_inizio" required style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px;">
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr; gap: 15px;">
        <div>
          <label style="display: block; margin-bottom: 5px; font-weight: 600;">Data Scadenza Patente *</label>
          <input type="date" id="driver1_patente_scadenza" required style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px;">
        </div>
      </div>
    </div>

       <!-- SEZIONE 3: FORM AUTISTA 2 (OPZIONALE) -->
    <div class="driver-form" id="driver-form-2" style="display: none; background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h3 style="color: #007f17; margin-bottom: 20px;">🚗 Autista 2 (Opzionale)</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
        <div><label style="display: block; margin-bottom: 5px; font-weight: 600;">Nome</label><input type="text" id="driver2_nome" placeholder="Es: Mario" style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px;"></div>
        <div><label style="display: block; margin-bottom: 5px; font-weight: 600;">Cognome</label><input type="text" id="driver2_cognome" placeholder="Es: Rossi" style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px;"></div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
        <div><label style="display: block; margin-bottom: 5px; font-weight: 600;">Codice Fiscale</label><input type="text" id="driver2_cf" placeholder="Es: RSSMRA85A10H501J" maxlength="16" style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px;"></div>
        <div><label style="display: block; margin-bottom: 5px; font-weight: 600;">Data Nascita</label><input type="date" id="driver2_datanascita" style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px;"></div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
        <div><label style="display: block; margin-bottom: 5px; font-weight: 600;">Indirizzo</label><input type="text" id="driver2_indirizzo" placeholder="Es: Via Roma 123" style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px;"></div>
        <div><label style="display: block; margin-bottom: 5px; font-weight: 600;">Città</label><input type="text" id="driver2_citta" placeholder="Es: Roma" style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px;"></div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
        <div><label style="display: block; margin-bottom: 5px; font-weight: 600;">Provincia (MAX 2 maiuscole)</label><input type="text" id="driver2_provincia" placeholder="RM" maxlength="2" pattern="[A-Z]{2}" style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px; text-transform: uppercase;"></div>
        <div><label style="display: block; margin-bottom: 5px; font-weight: 600;">Cellulare</label><input type="tel" id="driver2_cellulare" placeholder="Es: 3201234567" style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px;"></div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
        <div><label style="display: block; margin-bottom: 5px; font-weight: 600;">Numero Patente</label><input type="text" id="driver2_patente_numero" placeholder="Es: AB123456" style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px;"></div>
        <div><label style="display: block; margin-bottom: 5px; font-weight: 600;">Data Inizio Patente</label><input type="date" id="driver2_patente_inizio" style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px;"></div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr; gap: 15px;">
        <div><label style="display: block; margin-bottom: 5px; font-weight: 600;">Data Scadenza Patente</label><input type="date" id="driver2_patente_scadenza" style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px;"></div>
      </div>
    </div>

    <!-- SEZIONE 4: FORM AUTISTA 3 (OPZIONALE) -->
    <div class="driver-form" id="driver-form-3" style="display: none; background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h3 style="color: #007f17; margin-bottom: 20px;">🚗 Autista 3 (Opzionale)</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
        <div><label style="display: block; margin-bottom: 5px; font-weight: 600;">Nome</label><input type="text" id="driver3_nome" placeholder="Es: Mario" style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px;"></div>
        <div><label style="display: block; margin-bottom: 5px; font-weight: 600;">Cognome</label><input type="text" id="driver3_cognome" placeholder="Es: Rossi" style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px;"></div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
        <div><label style="display: block; margin-bottom: 5px; font-weight: 600;">Codice Fiscale</label><input type="text" id="driver3_cf" placeholder="Es: RSSMRA85A10H501J" maxlength="16" style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px;"></div>
        <div><label style="display: block; margin-bottom: 5px; font-weight: 600;">Data Nascita</label><input type="date" id="driver3_datanascita" style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px;"></div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
        <div><label style="display: block; margin-bottom: 5px; font-weight: 600;">Indirizzo</label><input type="text" id="driver3_indirizzo" placeholder="Es: Via Roma 123" style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px;"></div>
        <div><label style="display: block; margin-bottom: 5px; font-weight: 600;">Città</label><input type="text" id="driver3_citta" placeholder="Es: Roma" style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px;"></div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
        <div><label style="display: block; margin-bottom: 5px; font-weight: 600;">Provincia (MAX 2 maiuscole)</label><input type="text" id="driver3_provincia" placeholder="RM" maxlength="2" pattern="[A-Z]{2}" style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px; text-transform: uppercase;"></div>
        <div><label style="display: block; margin-bottom: 5px; font-weight: 600;">Cellulare</label><input type="tel" id="driver3_cellulare" placeholder="Es: 3201234567" style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px;"></div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
        <div><label style="display: block; margin-bottom: 5px; font-weight: 600;">Numero Patente</label><input type="text" id="driver3_patente_numero" placeholder="Es: AB123456" style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px;"></div>
        <div><label style="display: block; margin-bottom: 5px; font-weight: 600;">Data Inizio Patente</label><input type="date" id="driver3_patente_inizio" style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px;"></div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr; gap: 15px;">
        <div><label style="display: block; margin-bottom: 5px; font-weight: 600;">Data Scadenza Patente</label><input type="date" id="driver3_patente_scadenza" style="width: 100%; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px;"></div>
      </div>
    </div>

    <!-- BOTTONI AZIONI -->
    <div class="wizard-actions" style="display: flex; gap: 10px; justify-content: space-between; padding-top: 20px; border-top: 1px solid #dee2e6;">
      <button class="btn btn-secondary" onclick="tornaIndietro()">← Indietro</button>
      <button class="btn btn-success" onclick="procediStep3()">Avanti →</button>
    </div>
  `;
  
   // Inizializza listener Card
  initDriverSelector();
  
    // 🔴 PRE-COMPILA AUTISTA 1 CON DATI CLIENTE
    if (clienteCorrente) {
    if (qsId('driver1_nome')) qsId('driver1_nome').value = clienteCorrente.nome || '';
    if (qsId('driver1_cognome')) qsId('driver1_cognome').value = clienteCorrente.cognome || '';
    if (qsId('driver1_cf')) qsId('driver1_cf').value = clienteCorrente.cf || '';
    
    // 🔴 CONVERT DATE FORMAT
    if (qsId('driver1_datanascita') && clienteCorrente.dataNascita) {
      qsId('driver1_datanascita').value = formatDateToInput(clienteCorrente.dataNascita);
    }
    
    // 🔴 AGGIUNGI QUESTA RIGA (SE IL DATO VIENE RESTITUITO DALL'API)
    if (qsId('driver1_patente_inizio') && clienteCorrente.dataInizioPatente) {
      qsId('driver1_patente_inizio').value = formatDateToInput(clienteCorrente.dataInizioPatente);
    }
    
    if (qsId('driver1_patente_scadenza') && clienteCorrente.scadenzaPatente) {
      qsId('driver1_patente_scadenza').value = formatDateToInput(clienteCorrente.scadenzaPatente);
    }
    
    if (qsId('driver1_indirizzo')) qsId('driver1_indirizzo').value = clienteCorrente.viaResidenza || '';
    if (qsId('driver1_civico')) qsId('driver1_civico').value = clienteCorrente.civicoResidenza || '';
    if (qsId('driver1_provincia')) qsId('driver1_provincia').value = clienteCorrente.provincia || '';
    if (qsId('driver1_citta')) qsId('driver1_citta').value = clienteCorrente.comuneResidenza || '';
    if (qsId('driver1_cellulare')) qsId('driver1_cellulare').value = clienteCorrente.cellulare || '';
    if (qsId('driver1_patente_numero')) qsId('driver1_patente_numero').value = clienteCorrente.numeroPatente || '';
    
    Logger.info('✅ Autista 1 pre-compilato');
  }

  
  // 🔴 AUTO-FORMAT PROVINCIA CON PARENTESI
  [1, 2, 3].forEach(i => {
    const provField = qsId(`driver${i}_provincia`);
    if (provField) {
      provField.addEventListener('blur', (e) => {
        let val = e.target.value.toUpperCase().trim();
        if (val && val.length === 2 && !val.startsWith('(')) {
          e.target.value = `(${val})`;
        }
      });
    }
  });
}

function initDriverSelector() {
  const cards = document.querySelectorAll('.driver-card');
  cards.forEach(card => {
    card.addEventListener('click', selectDriverCount);
  });
}

function selectDriverCount(e) {
  const card = e.currentTarget;
  const count = parseInt(card.getAttribute('data-drivers'));
  
  // Rimuovi active da tutti
  document.querySelectorAll('.driver-card').forEach(c => c.classList.remove('active'));
  
  // Aggiungi active al selezionato
  card.classList.add('active');
  
  numDrivers = count;
  
  // Mostra/nascondi form
  showDriverForms(count);
  
  Logger.info(`👥 Selezionati ${count} autisti`);
}

function showDriverForms(count) {
  // Nascondi tutti
  qsId('driver-form-2').style.display = 'none';
  qsId('driver-form-3').style.display = 'none';
  
  // Mostra in base alla selezione
  if (count >= 2) {
    qsId('driver-form-2').style.display = 'block';
  }
  if (count >= 3) {
    qsId('driver-form-3').style.display = 'block';
  }
}

function procediStep3() {
  // Validazione autista principale (obbligatorio)
  if (!qsId('driver1_nome').value || !qsId('driver1_cognome').value) {
    showToast('❌ Compila tutti i dati dell\'autista principale!', 'error');
    return;
  }
  
  Logger.info('✅ Dati autisti raccolti');
  
  // Salva dati autisti
  booking_data.drivers = {
    count: numDrivers,
    driver1: {
      nome: qsId('driver1_nome').value,
      cognome: qsId('driver1_cognome').value,
      cf: qsId('driver1_cf').value,
      datanascita: qsId('driver1_datanascita').value,
      indirizzo: qsId('driver1_indirizzo').value,
      citta: qsId('driver1_citta').value,
      provincia: qsId('driver1_provincia').value.toUpperCase(),
      cellulare: qsId('driver1_cellulare').value,
      patente_numero: qsId('driver1_patente_numero').value,
      patente_inizio: qsId('driver1_patente_inizio').value,
      patente_scadenza: qsId('driver1_patente_scadenza').value
    }
  };
  
  // Salva autista 2 se presente
  if (numDrivers >= 2) {
    booking_data.drivers.driver2 = {
      nome: qsId('driver2_nome').value || '',
      cognome: qsId('driver2_cognome').value || '',
      cf: qsId('driver2_cf').value || '',
      datanascita: qsId('driver2_datanascita').value || '',
      indirizzo: qsId('driver2_indirizzo').value || '',
      citta: qsId('driver2_citta').value || '',
      provincia: (qsId('driver2_provincia').value || '').toUpperCase(),
      cellulare: qsId('driver2_cellulare').value || '',
      patente_numero: qsId('driver2_patente_numero').value || '',
      patente_inizio: qsId('driver2_patente_inizio').value || '',
      patente_scadenza: qsId('driver2_patente_scadenza').value || ''
    };
  }
  
  // Salva autista 3 se presente
  if (numDrivers >= 3) {
    booking_data.drivers.driver3 = {
      nome: qsId('driver3_nome').value || '',
      cognome: qsId('driver3_cognome').value || '',
      cf: qsId('driver3_cf').value || '',
      datanascita: qsId('driver3_datanascita').value || '',
      indirizzo: qsId('driver3_indirizzo').value || '',
      citta: qsId('driver3_citta').value || '',
      provincia: (qsId('driver3_provincia').value || '').toUpperCase(),
      cellulare: qsId('driver3_cellulare').value || '',
      patente_numero: qsId('driver3_patente_numero').value || '',
      patente_inizio: qsId('driver3_patente_inizio').value || '',
      patente_scadenza: qsId('driver3_patente_scadenza').value || ''
    };
  }
  
  Logger.info('✅ STEP 3 completato - Procedi a STEP 4');
  showStep('step-4');
}


function toggleAutista(numero) {
  const checkbox = qsId(`aggiungi-autista-${numero}`);
  const form = qsId(`autista-${numero}-form`);
  if (form) form.style.display = checkbox.checked ? 'block' : 'none';
}

function mostraRiepilogo() {
  const container = qsId('riepilogo-prenotazione');
  const b = booking_data;

  container.innerHTML = `
    <div class="booking-details">
      <div class="detail-item">
        <span class="detail-label">Veicolo:</span>
        <span class="detail-value">🚗 ${sanitizeHTML(b.targa)}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Ritiro:</span>
        <span class="detail-value">${sanitizeHTML(b.dataRitiro)} ${sanitizeHTML(b.oraRitiro)}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Restituzione:</span>
        <span class="detail-value">${sanitizeHTML(b.dataRestituzione)} ${sanitizeHTML(b.oraRestituzione)}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Destinazione:</span>
        <span class="detail-value">${sanitizeHTML(b.destinazione || 'Non specificata')}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Importo Preventivo:</span>
        <span class="detail-value" style="font-size: 1.3rem; color: var(--primary-color);">💰 €${sanitizeHTML(b.importo)}</span>
      </div>
    </div>
  `;
}

async function confermaPrenotazione() {
  try {
    showLoader(true);

    const payload = {
      action: 'manageBooking',
      token: FRONTEND_CONFIG.TOKEN,
      mode: selectedBookingId ? 'update' : 'create',
      cf: clienteCorrente.cf,
      idPrenotazione: selectedBookingId || '',
      targa: booking_data.targa,
      dataRitiro: booking_data.dataRitiro,
      dataArrivo: booking_data.dataRestituzione,
      oraRitiro: booking_data.oraRitiro,
      oraArrivo: booking_data.oraRestituzione,
      destinazione: booking_data.destinazione,
      note: ''
    };

    const result = await callAPI('manageBooking', payload, 'POST');

    showLoader(false);

    if (result.success) {
      const bookingId = result.id;
      showToast(SUCCESS_MESSAGES.BOOKING_CREATED, 'success');
      
      // Genera PDF con retry
      await generaPDFConRetry(bookingId);

      // Reload
      setTimeout(() => {
        location.reload();
      }, 2000);
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    showLoader(false);
    showToast('❌ Errore: ' + error.message, 'error');
  }
}

async function generaPDFConRetry(bookingId, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const payload = {
        action: 'generatePDF',
        token: FRONTEND_CONFIG.TOKEN,
        idPrenotazione: bookingId,
        cf: clienteCorrente.cf
      };

      const result = await callAPI('generatePDF', payload, 'POST');

      if (result.success && result.pdfUrl) {
        showToast(`✅ PDF: ${result.nomeFile}`, 'success');
        return result.pdfUrl;
      }
    } catch (error) {
      if (i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  Logger.warn('PDF generation failed after retries');
  return null;
}

function tornaStep(stepNum) {
  showStep(`step-${stepNum}`);
}

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

console.log('%c✅ scripts.js v' + VERSION + ' caricato', 'color: #28a745; font-weight: bold;');
// =====================
// RENDERING FUNCTIONS (Cont.)
// =====================
function renderPrenotazioniTabs() {
  const prenotazioniTabs = {};
  
  for (const p of prenotazioniUtente) {
    if (!prenotazioniTabs[p.stato]) prenotazioniTabs[p.stato] = [];
    prenotazioniTabs[p.stato].push(p);
  }

  renderPrenotazioniList();
}

function downloadPDF(bookingId) {
  const booking = prenotazioniUtente.find(b => b.id === bookingId);
  if (!booking) return;
  
  showToast('📥 Scaricamento PDF...', 'info');
  // Il link PDF dovrebbe essere generato dal backend
  // Per ora mostriamo un messaggio
  showToast('📄 PDF disponibile - contatta admin@imbriani.it per riceverlo.', 'info');
}

// =====================
// UTILITY FUNCTIONS
// =====================
function renderPersonalAreaTabs() {
  // Called after loading bookings
  Logger.info('Personal area tabs ready');
}

// =====================
// ERROR HANDLERS
// =====================
function handleAPIError(error, context = '') {
  Logger.error(`API Error [${context}]: ${error.message}`);
  
  if (error.message.includes('Token')) {
    showToast('❌ Sessione scaduta. Esegui login.', 'error');
    handleLogout();
  } else if (error.message.includes('timeout') || error.message.includes('Timeout')) {
    showToast(ERROR_MESSAGES.TIMEOUT, 'error');
  } else if (error.message.includes('Network')) {
    showToast(ERROR_MESSAGES.NETWORK_ERROR, 'error');
  } else {
    showToast(`❌ ${error.message}`, 'error');
  }
}

// =====================
// FORM VALIDATION
// =====================
function validateBookingForm() {
  const errors = [];

  if (!booking_data.dataRitiro || !booking_data.dataRestituzione) {
    errors.push('❌ Seleziona date valide');
  }

  if (!booking_data.targa) {
    errors.push('❌ Seleziona un veicolo');
  }

  if (errors.length > 0) {
    showToast(errors[0], 'error');
    return false;
  }

  return true;
}

// =====================
// DATE CALCULATIONS
// =====================
function calculateRentalDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
  return Math.max(days, 1);
}

function calculateTotalCost(days, dailyRate) {
  return Math.round(days * dailyRate);
}

// =====================
// NOTIFICATION HELPERS
// =====================
function sendBookingNotification(bookingId, action) {
  const message = {
    'created': `✅ Prenotazione ${bookingId} creata!`,
    'updated': `✅ Prenotazione ${bookingId} aggiornata!`,
    'deleted': `✅ Prenotazione ${bookingId} cancellata!`,
    'confirmed': `✅ Prenotazione ${bookingId} confermata!`
  };

  showToast(message[action] || 'Operazione completata', 'success');
}

// =====================
// SESSION MANAGEMENT
// =====================
function saveSession() {
  saveToStorage('currentCF', clienteCorrente.cf);
  saveToStorage('clienteData', JSON.stringify(clienteCorrente));
  saveToStorage('bookingData', JSON.stringify(booking_data));
}

function restoreSession() {
  const cf = getFromStorage('currentCF');
  const data = getFromStorage('clienteData');
  const booking = getFromStorage('bookingData');

  if (cf && data) {
    clienteCorrente = JSON.parse(data);
    if (booking) booking_data = JSON.parse(booking);
    return true;
  }

  return false;
}

function clearSession() {
  removeFromStorage('currentCF');
  removeFromStorage('clienteData');
  removeFromStorage('bookingData');
}

// =====================
// ACCESSIBILITY
// =====================
function makeFormAccessible() {
  const inputs = qsAll('input, select, textarea, button');
  
  inputs.forEach((input, index) => {
    if (!input.id) {
      input.id = `input-${index}`;
    }
    
    if (!input.getAttribute('aria-label')) {
      const label = input.previousElementSibling?.textContent || input.placeholder;
      if (label) {
        input.setAttribute('aria-label', label);
      }
    }
  });

  // Add skip link
  const skipLink = document.createElement('a');
  skipLink.href = '#main-content';
  skipLink.textContent = 'Skip to main content';
  skipLink.style.cssText = 'position: absolute; top: -40px; left: 0; background: #000; color: #fff; padding: 8px;';
  skipLink.addEventListener('focus', function() {
    this.style.top = '0';
  });
  skipLink.addEventListener('blur', function() {
    this.style.top = '-40px';
  });
  document.body.prepend(skipLink);
}

// =====================
// PERFORMANCE
// =====================
let requestCache = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function cachedAPICall(action, payload) {
  const cacheKey = `${action}_${JSON.stringify(payload)}`;
  const cached = requestCache[cacheKey];

  if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
    Logger.debug(`Cache hit for ${action}`);
    return cached.data;
  }

  const result = await callAPI(action, payload, 'POST');
  requestCache[cacheKey] = { data: result, timestamp: Date.now() };
  return result;
}

// =====================
// RESPONSIVE HELPERS
// =====================
function isSmallScreen() {
  return window.innerWidth < 768;
}

function isMobileScreen() {
  return window.innerWidth < 480;
}

window.addEventListener('resize', debounce(() => {
  Logger.debug(`Window resized: ${window.innerWidth}x${window.innerHeight}`);
  // Adjust layout if needed
}, FRONTEND_CONFIG.DEBOUNCE_MS));

// =====================
// INITIALIZATION HOOKS
// =====================
window.addEventListener('beforeunload', () => {
  if (clienteCorrente && booking_data.targa) {
    saveSession();
  }
});

window.addEventListener('online', () => {
  showToast('✅ Connessione ripristinata!', 'success');
  caricaPrenotazioniPersonali(clienteCorrente.cf);
});

window.addEventListener('offline', () => {
  showToast('⚠️ Connessione persa. Lavoro offline.', 'warning');
});

// =====================
// ANALYTICS (Optional)
// =====================
function trackEvent(category, action, label = '') {
  const event = { category, action, label, timestamp: new Date().toISOString() };
  Logger.debug(`Event tracked: ${JSON.stringify(event)}`);
  // Invia a Google Analytics o simile
}

// =====================
// TESTING FUNCTIONS
// =====================
function testBookingForm() {
  Logger.log('🧪 Test booking form');
  booking_data = {
    dataRitiro: '2025-11-15',
    dataRestituzione: '2025-11-17',
    oraRitiro: '08:00',
    oraRestituzione: '18:00',
    targa: 'EC787NM',
    destinazione: 'Roma',
    importo: 200,
    tariffaGiorno: 100
  };
  Logger.log('Booking data set: ' + JSON.stringify(booking_data));
}

function testSessionStorage() {
  Logger.log('🧪 Test session storage');
  const testData = { test: 'value', timestamp: Date.now() };
  saveToStorage('testKey', testData);
  const retrieved = getFromStorage('testKey');
  Logger.log('Saved: ' + JSON.stringify(testData) + ' | Retrieved: ' + JSON.stringify(retrieved));
  removeFromStorage('testKey');
}

function testDateCalculations() {
  Logger.log('🧪 Test date calculations');
  const start = '2025-11-15';
  const end = '2025-11-17';
  const days = calculateRentalDays(start, end);
  const cost = calculateTotalCost(days, 100);
  Logger.log(`Days: ${days}, Cost: €${cost}`);
}

// =====================
// BOOT SEQUENCE
// =====================
function bootApplication() {
  Logger.info('🚀 Application boot started');
  
  makeFormAccessible();
  initializeUI();
  checkExistingSession();
  
  // Verify API connectivity
  callAPI('health', {}, 'GET')
    .then(result => Logger.info('✅ API healthy: ' + result.version))
    .catch(err => Logger.error('❌ API check failed: ' + err.message));

  Logger.info('🚀 Application boot completed');
}

// Auto-boot on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApplication);
} else {
  bootApplication();
}

console.log('%c✅ scripts.js PARTE 2/3 caricato', 'color: #28a745; font-weight: bold;');
// =====================
// ENHANCED STATE MANAGEMENT
// =====================
class BookingStateManager {
  constructor() {
    this.state = {
      booking: {},
      drivers: [],
      vehicle: null,
      selectedDates: null,
      totalCost: 0,
      status: 'draft'
    };
  }

  setState(partial) {
    this.state = { ...this.state, ...partial };
    Logger.debug('State updated: ' + JSON.stringify(this.state));
  }

  getState() {
    return { ...this.state };
  }

  reset() {
    this.state = {
      booking: {},
      drivers: [],
      vehicle: null,
      selectedDates: null,
      totalCost: 0,
      status: 'draft'
    };
  }
}

const bookingManager = new BookingStateManager();

// =====================
// ADVANCED VALIDATION
// =====================
class BookingValidator {
  static validateDates(startDate, endDate) {
    const errors = [];
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    if (start < now) errors.push('Data inizio nel passato');
    if (end <= start) errors.push('Data fine deve essere dopo inizio');
    if ((end - start) / (1000*60*60*24) > FRONTEND_CONFIG.MAX_GIORNI_PRENOTAZIONE) {
      errors.push(`Max ${FRONTEND_CONFIG.MAX_GIORNI_PRENOTAZIONE} giorni`);
    }

    return { valid: errors.length === 0, errors };
  }

  static validateVehicle(vehicle) {
    if (!vehicle || !vehicle.targa) return { valid: false, errors: ['Veicolo non valido'] };
    return { valid: true, errors: [] };
  }

  static validateDriver(driver) {
    const errors = [];
    
    if (!driver.nome) errors.push('Nome obbligatorio');
    if (!driver.cf || !isValidCF(driver.cf)) errors.push('CF non valido');
    if (!driver.numeroPatente) errors.push('Patente obbligatoria');

    return { valid: errors.length === 0, errors };
  }

  static validateBooking(booking) {
    const errors = [];

    const datesCheck = this.validateDates(booking.dataRitiro, booking.dataRestituzione);
    if (!datesCheck.valid) errors.push(...datesCheck.errors);

    const vehicleCheck = this.validateVehicle(booking.vehicle);
    if (!vehicleCheck.valid) errors.push(...vehicleCheck.errors);

    return { valid: errors.length === 0, errors };
  }
}

// =====================
// ENHANCED FORM HANDLING
// =====================
function handleFormWithValidation(formData) {
  const validation = BookingValidator.validateBooking(formData);

  if (!validation.valid) {
    validation.errors.forEach(error => {
      showToast('❌ ' + error, 'error');
    });
    return false;
  }

  return true;
}

// =====================
// NETWORK STATE DETECTION
// =====================
class NetworkStateManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.initListeners();
  }

  initListeners() {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  handleOnline() {
    this.isOnline = true;
    showToast('✅ Connessione ripristinata', 'success');
    Logger.info('Network: ONLINE');
  }

  handleOffline() {
    this.isOnline = false;
    showToast('⚠️ Offline - funzioni limitate', 'warning');
    Logger.warn('Network: OFFLINE');
  }

  async executeWhenOnline(callback) {
    if (this.isOnline) {
      return await callback();
    } else {
      return new Promise((resolve, reject) => {
        const checkConnection = setInterval(() => {
          if (this.isOnline) {
            clearInterval(checkConnection);
            callback().then(resolve).catch(reject);
          }
        }, 1000);
      });
    }
  }
}

const networkManager = new NetworkStateManager();

// =====================
// NOTIFICATION SYSTEM
// =====================
class NotificationManager {
  static success(message, duration = FRONTEND_CONFIG.TOAST_DURATION_MS) {
    showToast(`✅ ${message}`, 'success', duration);
  }

  static error(message, duration = FRONTEND_CONFIG.TOAST_DURATION_MS) {
    showToast(`❌ ${message}`, 'error', duration);
  }

  static warning(message, duration = FRONTEND_CONFIG.TOAST_DURATION_MS) {
    showToast(`⚠️ ${message}`, 'warning', duration);
  }

  static info(message, duration = FRONTEND_CONFIG.TOAST_DURATION_MS) {
    showToast(`ℹ️ ${message}`, 'info', duration);
  }
}

// =====================
// PRICE CALCULATION ENGINE
// =====================
class PriceCalculator {
  static calculateBookingPrice(startDate, endDate, dailyRate) {
    const days = calculateRentalDays(startDate, endDate);
    return this.calculatePrice(days, dailyRate);
  }

  static calculatePrice(days, dailyRate) {
    if (days < 1) days = 1;
    return Math.round(days * dailyRate);
  }

  static applyDiscount(price, discountPercent) {
    return Math.round(price * (1 - discountPercent / 100));
  }

  static addTax(price, taxPercent = 0) {
    return Math.round(price * (1 + taxPercent / 100));
  }

  static formatPrice(price) {
    return `€${price.toFixed(2)}`;
  }
}

// =====================
// EXPORT/IMPORT
// =====================
function exportBookingAsJSON() {
  if (!clienteCorrente) {
    NotificationManager.error('Nessun cliente loggato');
    return;
  }

  const data = {
    cliente: clienteCorrente,
    prenotazioni: prenotazioniUtente,
    exportDate: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bookings_${clienteCorrente.cf}_${Date.now()}.json`;
  a.click();

  NotificationManager.success('Dati esportati');
}

// =====================
// PRINT FUNCTIONALITY
// =====================
function printBooking(bookingId) {
  const booking = prenotazioniUtente.find(b => b.id === bookingId);
  if (!booking) return;

  const printWindow = window.open('', '', 'height=600,width=800');
  printWindow.document.write(`
    <html>
      <head>
        <title>Prenotazione ${bookingId}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #007f17; }
          .details { margin: 20px 0; }
          .detail { margin: 10px 0; }
          .label { font-weight: bold; }
          .value { margin-left: 10px; }
        </style>
      </head>
      <body>
        <h1>Prenotazione Imbriani Noleggio</h1>
        <div class="details">
          <div class="detail">
            <span class="label">ID:</span>
            <span class="value">${booking.id}</span>
          </div>
          <div class="detail">
            <span class="label">Veicolo:</span>
            <span class="value">${booking.targa}</span>
          </div>
          <div class="detail">
            <span class="label">Ritiro:</span>
            <span class="value">${booking.dataInizio} ${booking.oraInizio}</span>
          </div>
          <div class="detail">
            <span class="label">Restituzione:</span>
            <span class="value">${booking.dataFine} ${booking.oraFine}</span>
          </div>
          <div class="detail">
            <span class="label">Importo:</span>
            <span class="value">€${booking.importo}</span>
          </div>
          <div class="detail">
            <span class="label">Stato:</span>
            <span class="value">${booking.stato}</span>
          </div>
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

// =====================
// ADVANCED FILTERING
// =====================
class BookingFilter {
  static filterByStatus(bookings, status) {
    return bookings.filter(b => b.stato === status);
  }

  static filterByDateRange(bookings, startDate, endDate) {
    return bookings.filter(b => {
      const bStart = new Date(b.dataInizio);
      const bEnd = new Date(b.dataFine);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return bStart >= start && bEnd <= end;
    });
  }

  static filterByVehicle(bookings, targa) {
    return bookings.filter(b => b.targa === targa);
  }

  static filterByPriceRange(bookings, minPrice, maxPrice) {
    return bookings.filter(b => b.importo >= minPrice && b.importo <= maxPrice);
  }

  static search(bookings, query) {
    const q = query.toLowerCase();
    return bookings.filter(b => 
      b.id.toLowerCase().includes(q) ||
      b.targa.toLowerCase().includes(q) ||
      (b.destinazione && b.destinazione.toLowerCase().includes(q))
    );
  }
}

// =====================
// ADVANCED LOGGING
// =====================
class AdvancedLogger {
  static logEvent(eventType, data) {
    const timestamp = new Date().toISOString();
    const logEntry = { eventType, data, timestamp };
    
    if (FRONTEND_CONFIG.DEBUG) {
      console.log(`[${eventType}]`, logEntry);
    }

    // Salva in localStorage per debug
    const logs = getFromStorage('appLogs', []);
    logs.push(logEntry);
    if (logs.length > 100) logs.shift(); // Mantieni ultimi 100
    saveToStorage('appLogs', logs);
  }

  static getLogs() {
    return getFromStorage('appLogs', []);
  }

  static clearLogs() {
    removeFromStorage('appLogs');
  }

  static downloadLogs() {
    const logs = this.getLogs();
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs_${Date.now()}.json`;
    a.click();
  }
}

// =====================
// PERFORMANCE MONITORING
// =====================
class PerformanceMonitor {
  static measureOperation(name, fn) {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    Logger.debug(`Operation "${name}" took ${duration.toFixed(2)}ms`);
    
    if (duration > 1000) {
      Logger.warn(`Slow operation: "${name}" took ${duration.toFixed(2)}ms`);
    }

    return result;
  }

  static async measureAsync(name, fn) {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    
    Logger.debug(`Async operation "${name}" took ${duration.toFixed(2)}ms`);
    
    if (duration > 2000) {
      Logger.warn(`Slow async operation: "${name}" took ${duration.toFixed(2)}ms`);
    }

    return result;
  }
}

// =====================
// FINAL INITIALIZATION
// =====================
if (document.readyState !== 'loading') {
  // DOM già caricato
  initializeUI();
  checkExistingSession();
} else {
  // DOM non ancora caricato
  document.addEventListener('DOMContentLoaded', () => {
    initializeUI();
    checkExistingSession();
  });
}

// Service Worker (Per PWA offline support - opzionale)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => {
    Logger.warn('Service Worker not available: ' + err.message);
  });
}

// Beacon API per analytics
window.addEventListener('beforeunload', () => {
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics', JSON.stringify({
      event: 'page_close',
      session: getFromStorage('currentCF'),
      timestamp: new Date().toISOString()
    }));
  }
});

// =====================
// ⏰ ORARI DISPONIBILI (8-20 con intervalli di 4 ore)
// =====================
function getOreDisponibili() {
  return ['08:00', '12:00', '16:00', '20:00'];
}

// Funzione helper per creare select dinamico
function createOraSelect(selectId, defaultValue = '08:00') {
  const select = qsId(selectId);
  if (!select) return;
  
  const ore = getOreDisponibili();
  select.innerHTML = ore.map(ora => 
    `<option value="${ora}" ${ora === defaultValue ? 'selected' : ''}>${ora}</option>`
  ).join('');
}

// =====================
// STEP 2: SELEZIONE VEICOLO
// =====================
function selezionaVeicolo(targa, tariffaGiorno, importo) {
  Logger.info('✅ Veicolo selezionato: ' + targa);
  booking_data.targa = targa;
  booking_data.tariffaGiorno = tariffaGiorno;
  booking_data.importo = importo;
  qsId('btn-continua-step2').disabled = false;
  showToast(`✅ ${targa} selezionato!`, 'success');
}

// =====================
// PROCEDI A STEP 3
// =====================
function procediStep2() {
  if (!booking_data.targa) {
    showToast('❌ Seleziona un veicolo!', 'error');
    return;
  }
  Logger.info('✅ Vai a STEP 3');
  
  // Usa showStep() per gestire correttamente
  showStep('step-3');
  renderAutistiForm();
}
 function showStep(stepId) {
  Logger.info(`📺 Mostra STEP: ${stepId}`);
  document.querySelectorAll('.wizard-step').forEach(s => {
    s.style.display = 'none';
  });
  const step = document.getElementById(stepId);
  if (step) {
    step.style.display = 'block';
  }
}
 // =====================
// STEP 3 - CHI GUIDA? DRIVERS
// =====================

function initDriverSelector() {
  const cards = document.querySelectorAll('.driver-card');
  cards.forEach(card => {
    card.addEventListener('click', selectDriverCount);
  });
}

function selectDriverCount(e) {
  const card = e.currentTarget;
  const count = parseInt(card.getAttribute('data-drivers'));
  
  document.querySelectorAll('.driver-card').forEach(c => {
    c.style.background = '#f8f9fa';
    c.style.color = '#333';
    c.style.border = '2px solid #dee2e6';
    const cardNum = c.querySelector('.card-number');
    if (cardNum) cardNum.style.color = '#007f17';
  });
  
  card.style.background = '#007f17';
  card.style.color = 'white';
  card.style.border = '2px solid #007f17';
  const cardNum = card.querySelector('.card-number');
  if (cardNum) cardNum.style.color = 'white';
  
  window.numDrivers = count;
  showDriverForms(count);
  
  Logger.info(`👥 Selezionati ${count} autisti`);
}

function showDriverForms(count) {
  const form2 = qsId('driver-form-2');
  const form3 = qsId('driver-form-3');
  
  if (form2) form2.style.display = 'none';
  if (form3) form3.style.display = 'none';
  
  if (count >= 2 && form2) form2.style.display = 'block';
  if (count >= 3 && form3) form3.style.display = 'block';
}

function procediStep3() {
  const driver1_nome = qsId('driver1_nome');
  const driver1_cognome = qsId('driver1_cognome');
  
  if (!driver1_nome || !driver1_nome.value || !driver1_cognome || !driver1_cognome.value) {
    showToast('❌ Compila tutti i dati dell\'autista principale!', 'error');
    return;
  }
  
  Logger.info('✅ Dati autisti raccolti');
  
  booking_data.drivers = {
    count: window.numDrivers || 1,
    driver1: {
      nome: driver1_nome.value,
      cognome: driver1_cognome.value,
      cf: qsId('driver1_cf').value,
      datanascita: qsId('driver1_datanascita').value,
      indirizzo: qsId('driver1_indirizzo').value,
      citta: qsId('driver1_citta').value,
      provincia: (qsId('driver1_provincia').value || '').toUpperCase(),
      cellulare: qsId('driver1_cellulare').value,
      patente_numero: qsId('driver1_patente_numero').value,
      patente_inizio: qsId('driver1_patente_inizio').value,
      patente_scadenza: qsId('driver1_patente_scadenza').value
    }
  };
  
  if ((window.numDrivers || 1) >= 2) {
    booking_data.drivers.driver2 = {
      nome: qsId('driver2_nome').value || '',
      cognome: qsId('driver2_cognome').value || '',
      cf: qsId('driver2_cf').value || '',
      datanascita: qsId('driver2_datanascita').value || '',
      indirizzo: qsId('driver2_indirizzo').value || '',
      citta: qsId('driver2_citta').value || '',
      provincia: (qsId('driver2_provincia').value || '').toUpperCase(),
      cellulare: qsId('driver2_cellulare').value || '',
      patente_numero: qsId('driver2_patente_numero').value || '',
      patente_inizio: qsId('driver2_patente_inizio').value || '',
      patente_scadenza: qsId('driver2_patente_scadenza').value || ''
    };
  }
  
  if ((window.numDrivers || 1) >= 3) {
    booking_data.drivers.driver3 = {
      nome: qsId('driver3_nome').value || '',
      cognome: qsId('driver3_cognome').value || '',
      cf: qsId('driver3_cf').value || '',
      datanascita: qsId('driver3_datanascita').value || '',
      indirizzo: qsId('driver3_indirizzo').value || '',
      citta: qsId('driver3_citta').value || '',
      provincia: (qsId('driver3_provincia').value || '').toUpperCase(),
      cellulare: qsId('driver3_cellulare').value || '',
      patente_numero: qsId('driver3_patente_numero').value || '',
      patente_inizio: qsId('driver3_patente_inizio').value || '',
      patente_scadenza: qsId('driver3_patente_scadenza').value || ''
    };
  }
  
  Logger.info('✅ STEP 3 completato');
  showStep('step-4');
  mostraRiepilogo();
}

console.log('%c🎉 scripts.js v' + VERSION + ' COMPLETO', 'color: #28a745; font-weight: bold; font-size: 14px;');
console.log('%c📊 Managers disponibili: bookingManager, networkManager, NotificationManager, PriceCalculator, BookingFilter, AdvancedLogger, PerformanceMonitor', 'color: #17a2b8;');
