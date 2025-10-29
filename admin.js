/* Imbriani Noleggio – admin.js v2.7.1 SECURITY UPDATE
   
   ═══════════════════════════════════════════════════════════════════
   CHANGELOG - DASHBOARD ADMIN
   ═══════════════════════════════════════════════════════════════════
   
   📌 v2.7.1 SECURITY - 29 Ottobre 2025 12:59 CET
   🛡️ XSS Protection: sanitizzazione dati tabella e modal
   🔐 Rate Limiting: blocco 5 tentativi login / 15 minuti
   🔧 Funzioni security: sanitizeHTML, checkLoginRateLimit
   🔧 Password validation con countdown automatico
   
   📌 v2.7 FINALE - 29 Ottobre 2025 11:37 CET
   🔧 Action "unconfirm" implementata
   🔧 Annulla conferma → Elimina PDF + Stato "Da confermare"
   🔧 Auto-refresh dashboard dopo annullamento
   🔧 Pulsante "Riporta a Da confermare"
   🔧 Stati dinamici: Futura, In corso, Completato
   
   ═══════════════════════════════════════════════════════════════════
*/

'use strict';

const ADMIN_VERSION = '2.7.1';
const ADMIN_BUILD_DATE = '2025-10-29';

console.log(`%c🔐 Admin Dashboard v${ADMIN_VERSION}`, 'font-size: 16px; font-weight: bold; color: #667eea;');
console.log(`%c📅 Build: ${ADMIN_BUILD_DATE} | Security Hardened 🛡️`, 'color: #666;');
console.log(`%c✨ Gestione prenotazioni completa`, 'color: #22c55e;');

// ========== CONFIGURAZIONE ==========
const ADMIN_CONFIG = {
  password: 'Imbriani2025+',
  endpoints: {
    adminPrenotazioni: 'https://script.google.com/macros/s/AKfycbz7y_JsC0LaFW61xSotLQ1utSbqHDM6dSnfZ2M0sCa97_DeX4xeEeGDgwThCLpXXz8/exec',
    manageBooking: 'https://script.google.com/macros/s/AKfycbxAKX12Sgc0ODvGtUEXCRoINheSeO9-SgDNGuY1QtrVKBENdY0SpMiDtzgoxIBRCuQ/exec'
  }
};

// ========== SECURITY: XSS PROTECTION & RATE LIMITING ==========
/**
 * Sanitizza stringa per prevenire XSS
 */
function sanitizeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Rate limiting per login admin
 */
function checkLoginRateLimit() {
  const now = Date.now();
  const key = 'admin_login_attempts';
  const lockKey = 'admin_login_lock';
  const timeKey = 'admin_login_lock_time';
  
  const locked = localStorage.getItem(lockKey);
  const lockTime = parseInt(localStorage.getItem(timeKey) || '0');
  
  if (locked === 'true') {
    const elapsed = now - lockTime;
    const lockDuration = 15 * 60 * 1000; // 15 minuti
    
    if (elapsed < lockDuration) {
      const remainingMin = Math.ceil((lockDuration - elapsed) / 60000);
      return {
        allowed: false,
        message: `Troppi tentativi errati. Riprova tra ${remainingMin} minuti.`,
        remainingTime: remainingMin
      };
    } else {
      localStorage.removeItem(lockKey);
      localStorage.removeItem(timeKey);
      localStorage.setItem(key, '0');
    }
  }
  
  const attempts = parseInt(localStorage.getItem(key) || '0');
  
  if (attempts >= 5) {
    localStorage.setItem(lockKey, 'true');
    localStorage.setItem(timeKey, now.toString());
    return {
      allowed: false,
      message: 'Troppi tentativi errati. Account bloccato per 15 minuti.',
      remainingTime: 15
    };
  }
  
  return { allowed: true, message: '', remainingTime: 0 };
}

function registerFailedLogin() {
  const key = 'admin_login_attempts';
  const attempts = parseInt(localStorage.getItem(key) || '0');
  localStorage.setItem(key, (attempts + 1).toString());
  
  const remaining = 5 - (attempts + 1);
  if (remaining > 0) {
    console.warn(`⚠️ Login fallito. Tentativi rimasti: ${remaining}`);
  }
}

function resetLoginAttempts() {
  localStorage.setItem('admin_login_attempts', '0');
  localStorage.removeItem('admin_login_lock');
  localStorage.removeItem('admin_login_lock_time');
  console.log('✅ Tentativi login resettati');
}

console.log('🛡️ XSS Protection & Rate Limiting attivo - admin.js v2.7.1');

// ========== STATE ==========
let prenotazioni = [];
let prenotazioneDaConfermare = null;
let filtroAttivoStat = 'totali';
let ordinamentoAttuale = { campo: null, direzione: 'asc' };

// ========== UTILITY ==========
function showLoader(show = true) {
  const loader = document.getElementById('loader');
  if (loader) {
    loader.classList.toggle('active', show);
  }
}

function showToast(message, type = 'info') {
  alert(message);
}

// ========== HELPER FORMATTAZIONE DATE ==========
function formattaData(dataStr) {
  if (!dataStr) return 'N/A';
  
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataStr)) {
    return dataStr;
  }
  
  try {
    const data = new Date(dataStr);
    if (!isNaN(data.getTime())) {
      const dd = String(data.getDate()).padStart(2, '0');
      const mm = String(data.getMonth() + 1).padStart(2, '0');
      const yyyy = data.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
  } catch (e) {
    // Fallback
  }
  
  return String(dataStr);
}

function formattaOra(oraStr) {
  if (!oraStr) return '00:00';
  
  if (/^\d{2}:\d{2}$/.test(oraStr)) {
    return oraStr;
  }
  
  try {
    const data = new Date(oraStr);
    if (!isNaN(data.getTime())) {
      const hh = String(data.getHours()).padStart(2, '0');
      const mm = String(data.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }
  } catch (e) {
    // Fallback
  }
  
  return String(oraStr);
}

// ========== CALCOLO STATO CENTRALIZZATO ==========
function calcolaStatoEffettivo(prenotazione) {
  const statoReale = prenotazione.stato || '';
  
  if (statoReale === 'Da confermare') {
    return statoReale;
  }
  
  return statoReale;
}

function convertiDataPerFiltro(dataStr) {
  if (!dataStr) return null;
  
  const match = dataStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    const [, giorno, mese, anno] = match;
    return new Date(parseInt(anno), parseInt(mese) - 1, parseInt(giorno));
  }
  
  return null;
}

// ========== LOGIN ==========
function tentaLoginAdmin() {
  const passwordInput = document.getElementById('passwordInput');
  const loginError = document.getElementById('loginError');
  
  if (!passwordInput || !loginError) return;
  
  // Controlla rate limiting PRIMA di verificare password
  const rateLimitCheck = checkLoginRateLimit();
  
  if (!rateLimitCheck.allowed) {
    loginError.textContent = sanitizeHTML(rateLimitCheck.message);
    loginError.style.display = 'block';
    passwordInput.disabled = true;
    
    // Countdown per sblocco
    let remaining = rateLimitCheck.remainingTime;
    const countdown = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(countdown);
        passwordInput.disabled = false;
        loginError.style.display = 'none';
      } else {
        loginError.textContent = `Troppi tentativi. Riprova tra ${remaining} minuti.`;
      }
    }, 60000); // Update ogni minuto
    
    return;
  }
  
  const passwordInserita = passwordInput.value.trim();
  
  if (passwordInserita === ADMIN_CONFIG.password) {
    // Password corretta - reset tentativi
    resetLoginAttempts();
    
    sessionStorage.setItem('adminLoggedIn', 'true');
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('dashboardContent').style.display = 'block';
    loginError.style.display = 'none';
    
    caricaPrenotazioni();
  } else {
    // Password errata - registra tentativo
    registerFailedLogin();
    
    loginError.textContent = 'Password errata!';
    loginError.style.display = 'block';
  }
}

function logout() {
  if (confirm('Vuoi uscire dalla dashboard?')) {
    sessionStorage.removeItem('adminLoggedIn');
    
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('dashboardContent').style.display = 'none';
    document.getElementById('passwordInput').value = '';
    prenotazioni = [];
  }
}

// ========== CARICA PRENOTAZIONI ==========
async function caricaPrenotazioni(cacheBuster = null) {
  showLoader(true);
  
  try {
    let url = ADMIN_CONFIG.endpoints.adminPrenotazioni + '?action=list';
    
    if (cacheBuster) {
      url += '&t=' + cacheBuster;
    } else {
      url += '&t=' + new Date().getTime();
    }
    
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-cache'
    });
    
    const result = await response.json();
    
    if (result.success) {
      prenotazioni = result.prenotazioni || [];
      aggiornaStatistiche(result.statistiche);
      renderTabella(prenotazioni);
    } else {
      showToast('❌ Errore caricamento: ' + (result.error || 'Sconosciuto'), 'error');
    }
  } catch (error) {
    console.error('Errore caricamento:', error);
    showToast('❌ Errore connessione al server', 'error');
  } finally {
    showLoader(false);
  }
}

// ========== STATISTICHE ==========
function aggiornaStatistiche(stats) {
  document.getElementById('stat-totali').textContent = stats.totali || 0;
  document.getElementById('stat-daconfermare').textContent = stats.daConfermare || 0;
  document.getElementById('stat-completate').textContent = stats.completate || 0;
  document.getElementById('stat-corso').textContent = stats.inCorso || 0;
  document.getElementById('stat-future').textContent = stats.confermate || 0;
}

// ========== RENDER TABELLA ==========
function renderTabella(datiPrenotazioni) {
  const tbody = document.getElementById('table-body');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (datiPrenotazioni.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">Nessuna prenotazione trovata</td></tr>';
    return;
  }
  
  datiPrenotazioni.forEach(pren => {
    const tr = document.createElement('tr');
    
    const statoCalcolato = calcolaStatoEffettivo(pren);
    let badgeStato = '';
    
    if (statoCalcolato === 'Da confermare') {
      badgeStato = '<span class="badge warning">⏳ Da confermare</span>';
    } else if (statoCalcolato === 'Futura') {
      badgeStato = '<span class="badge info">📅 Futura</span>';
    } else if (statoCalcolato === 'In corso') {
      badgeStato = '<span class="badge info">🚐 In corso</span>';
    } else if (statoCalcolato === 'Completato') {
      badgeStato = '<span class="badge" style="background: #e5e7eb; color: #374151;">✓ Completato</span>';
    } else {
      badgeStato = '<span class="badge info">' + sanitizeHTML(statoCalcolato) + '</span>';
    }
    
    let azioni = `
      <button class="btn-icon" onclick="apriModalModifica('${sanitizeHTML(pren.idPrenotazione)}')" title="Modifica">
        <span class="material-icons">edit</span>
      </button>
    `;
    
    if (pren.stato === 'Da confermare') {
      azioni += `
        <button class="btn-icon" onclick="apriModalConferma('${sanitizeHTML(pren.idPrenotazione)}')" title="Conferma e genera PDF" style="color: #22c55e;">
          <span class="material-icons">check_circle</span>
        </button>
      `;
    }
    
    const dalCompleto = formattaData(pren.giornoInizio) + ' ore ' + formattaOra(pren.oraInizio);
    const alCompleto = formattaData(pren.giornoFine) + ' ore ' + formattaOra(pren.oraFine);
    
    tr.innerHTML = `
      <td>${sanitizeHTML(pren.nome)}</td>
      <td>${getNomePulmino(sanitizeHTML(pren.targa))}</td>
      <td>${dalCompleto}</td>
      <td>${alCompleto}</td>
      <td>${sanitizeHTML(pren.cellulare)}</td>
      <td>${badgeStato}</td>
      <td class="actions">${azioni}</td>
    `;
    
    tbody.appendChild(tr);
  });
}

function getNomePulmino(targa) {
  if (targa === 'EC787NM') return 'Ducato Lungo';
  if (targa === 'DN391FW') return 'Ducato Corto';
  if (targa === 'DL291XZ') return 'Peugeot';
  return sanitizeHTML(targa);
}

// ========== FILTRI ==========
function applicaFiltroDashboard(tipo) {
  filtroAttivoStat = tipo;
  
  document.querySelectorAll('.stat-card').forEach(card => {
    card.classList.remove('active');
  });
  
  const filterCard = document.getElementById('filter-' + tipo);
  if (filterCard) {
    filterCard.classList.add('active');
  }
  
  let prenotazioniFiltrate = [];
  
  if (tipo === 'totali') {
    prenotazioniFiltrate = prenotazioni;
  } else if (tipo === 'daconfermare') {
    prenotazioniFiltrate = prenotazioni.filter(p => calcolaStatoEffettivo(p) === 'Da confermare');
  } else if (tipo === 'completate') {
    prenotazioniFiltrate = prenotazioni.filter(p => calcolaStatoEffettivo(p) === 'Completato');
  } else if (tipo === 'corso') {
    prenotazioniFiltrate = prenotazioni.filter(p => calcolaStatoEffettivo(p) === 'In corso');
  } else if (tipo === 'future') {
    prenotazioniFiltrate = prenotazioni.filter(p => calcolaStatoEffettivo(p) === 'Futura');
  }
  
  renderTabella(prenotazioniFiltrate);
}

function applicaFiltri() {
  const dataInizio = document.getElementById('filter-data-inizio')?.value;
  const dataFine = document.getElementById('filter-data-fine')?.value;
  const pulmino = document.getElementById('filter-pulmino')?.value;
  const stato = document.getElementById('filter-stato')?.value;
  
  let filtrate = [...prenotazioni];
  
  if (dataInizio) {
    filtrate = filtrate.filter(p => {
      const [d, m, y] = (p.giornoInizio || '').split('/');
      const dataISO = y && m && d ? `${y}-${m}-${d}` : '';
      return dataISO >= dataInizio;
    });
  }
  
  if (dataFine) {
    filtrate = filtrate.filter(p => {
      const [d, m, y] = (p.giornoFine || '').split('/');
      const dataISO = y && m && d ? `${y}-${m}-${d}` : '';
      return dataISO <= dataFine;
    });
  }
  
  if (pulmino) {
    filtrate = filtrate.filter(p => p.targa === pulmino);
  }
  
  if (stato) {
    filtrate = filtrate.filter(p => p.stato === stato);
  }
  
  renderTabella(filtrate);
}

// ========== ORDINAMENTO ==========
function ordinaPer(campo) {
  if (ordinamentoAttuale.campo === campo) {
    ordinamentoAttuale.direzione = ordinamentoAttuale.direzione === 'asc' ? 'desc' : 'asc';
  } else {
    ordinamentoAttuale.campo = campo;
    ordinamentoAttuale.direzione = 'asc';
  }
  
  prenotazioni.sort((a, b) => {
    let valA = a[campo] || '';
    let valB = b[campo] || '';
    
    if (campo === 'giornoInizio' || campo === 'giornoFine') {
      const dataA = convertiDataPerOrdinamento(valA);
      const dataB = convertiDataPerOrdinamento(valB);
      
      if (ordinamentoAttuale.direzione === 'asc') {
        return dataA - dataB;
      } else {
        return dataB - dataA;
      }
    }
    
    if (ordinamentoAttuale.direzione === 'asc') {
      return valA > valB ? 1 : -1;
    } else {
      return valA < valB ? 1 : -1;
    }
  });
  
  renderTabella(prenotazioni);
}

function convertiDataPerOrdinamento(dataStr) {
  if (!dataStr || dataStr === 'N/A') return 0;
  
  const match = dataStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    const [, giorno, mese, anno] = match;
    return new Date(parseInt(anno), parseInt(mese) - 1, parseInt(giorno)).getTime();
  }
  
  return 0;
}

// ========== MODAL CONFERMA ==========
function apriModalConferma(idPrenotazione) {
  prenotazioneDaConfermare = prenotazioni.find(p => p.idPrenotazione === idPrenotazione);
  
  if (!prenotazioneDaConfermare) {
    alert('Prenotazione non trovata');
    return;
  }
  
  const dettagli = document.getElementById('conferma-dettagli');
  if (dettagli) {
    dettagli.innerHTML = `
      <p><strong>ID:</strong> ${sanitizeHTML(prenotazioneDaConfermare.idPrenotazione)}</p>
      <p><strong>Cliente:</strong> ${sanitizeHTML(prenotazioneDaConfermare.nome)}</p>
      <p><strong>CF:</strong> ${sanitizeHTML(prenotazioneDaConfermare.cf)}</p>
      <p><strong>Veicolo:</strong> ${getNomePulmino(prenotazioneDaConfermare.targa)} (${sanitizeHTML(prenotazioneDaConfermare.targa)})</p>
      <p><strong>Dal:</strong> ${formattaData(prenotazioneDaConfermare.giornoInizio)} ore ${formattaOra(prenotazioneDaConfermare.oraInizio)}</p>
      <p><strong>Al:</strong> ${formattaData(prenotazioneDaConfermare.giornoFine)} ore ${formattaOra(prenotazioneDaConfermare.oraFine)}</p>
      <p><strong>Cellulare:</strong> ${sanitizeHTML(prenotazioneDaConfermare.cellulare)}</p>
    `;
  }
  
  const modal = document.getElementById('modalConferma');
  if (modal) {
    modal.classList.add('active');
  }
}

function chiudiModalConferma() {
  const modal = document.getElementById('modalConferma');
  if (modal) {
    modal.classList.remove('active');
  }
  
  const importoInput = document.getElementById('conferma-importo');
  if (importoInput) {
    importoInput.value = '';
  }
  
  prenotazioneDaConfermare = null;
}

// ========== CONFERMA PRENOTAZIONE ==========
async function confermaPrenotazioneAdmin() {
  if (!prenotazioneDaConfermare) {
    alert('Nessuna prenotazione selezionata');
    return;
  }
  
  const importoInput = document.getElementById('conferma-importo');
  if (!importoInput) return;
  
  const importo = importoInput.value.trim();
  
  if (!importo) {
    alert('⚠️ Inserisci l\'importo del preventivo');
    return;
  }
  
  if (!confirm(`Confermare prenotazione ${prenotazioneDaConfermare.idPrenotazione}?\n\nVerrà generato il contratto PDF e lo stato cambierà automaticamente.`)) {
    return;
  }
  
  showLoader(true);
  
  try {
    const payload = {
      action: 'confirm',
      idPrenotazione: prenotazioneDaConfermare.idPrenotazione,
      importo: importo
    };
    
    const params = new URLSearchParams();
    params.append('payload', JSON.stringify(payload));
    
    const response = await fetch(ADMIN_CONFIG.endpoints.manageBooking, {
      method: 'POST',
      body: params,
      redirect: 'follow'
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert('✅ Prenotazione confermata e PDF generato con successo!');
      chiudiModalConferma();
      await new Promise(resolve => setTimeout(resolve, 1000));
      const cacheBuster = new Date().getTime();
      await caricaPrenotazioni(cacheBuster);
      console.log('🔄 Dashboard aggiornata automaticamente');
    } else {
      alert('❌ Errore: ' + (result.error || result.message || 'Sconosciuto'));
    }
  } catch (error) {
    console.error('Errore conferma:', error);
    alert('❌ Errore durante la conferma: ' + error.message);
  } finally {
    showLoader(false);
  }
}

// ========== MODAL MODIFICA ==========
function apriModalModifica(idPrenotazione) {
  const prenotazione = prenotazioni.find(p => p.idPrenotazione === idPrenotazione);
  
  if (!prenotazione) {
    alert('Prenotazione non trovata');
    return;
  }
  
  const setValueIfExists = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.value = value || '';
  };
  
  setValueIfExists('mod-id', prenotazione.idPrenotazione);
  setValueIfExists('mod-nome', prenotazione.nome);
  setValueIfExists('mod-luogo-nascita', prenotazione.luogoNascita);
  setValueIfExists('mod-data-nascita', convertiDataPerInput(prenotazione.dataNascita));
  setValueIfExists('mod-cf', prenotazione.cf);
  setValueIfExists('mod-cellulare', prenotazione.cellulare);
  setValueIfExists('mod-comune-residenza', prenotazione.comuneResidenza);
  setValueIfExists('mod-via-residenza', prenotazione.viaResidenza);
  setValueIfExists('mod-civico-residenza', prenotazione.civicoResidenza);
  setValueIfExists('mod-numero-patente', prenotazione.numeroPatente);
  setValueIfExists('mod-data-inizio-patente', convertiDataPerInput(prenotazione.dataInizioPatente));
  setValueIfExists('mod-scadenza-patente', convertiDataPerInput(prenotazione.scadenzaPatente));
  setValueIfExists('mod-targa', prenotazione.targa);
  setValueIfExists('mod-data-inizio', convertiDataPerInput(prenotazione.giornoInizio));
  setValueIfExists('mod-ora-inizio', prenotazione.oraInizio);
  setValueIfExists('mod-data-fine', convertiDataPerInput(prenotazione.giornoFine));
  setValueIfExists('mod-ora-fine', prenotazione.oraFine);
  
  const statoLabel = document.getElementById('stato-attuale-label');
  if (statoLabel) {
    statoLabel.textContent = `Stato attuale: ${sanitizeHTML(prenotazione.stato)}`;
  }
  
  const modal = document.getElementById('modalModifica');
  if (modal) {
    modal.classList.add('active');
  }
}

function convertiDataPerInput(dataStr) {
  if (!dataStr) return '';
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) {
    return dataStr;
  }
  
  const match = dataStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    const [, giorno, mese, anno] = match;
    return `${anno}-${mese}-${giorno}`;
  }
  
  return '';
}

function chiudiModifica() {
  const modal = document.getElementById('modalModifica');
  if (modal) {
    modal.classList.remove('active');
  }
}

// ========== RIPORTA A "DA CONFERMARE" ==========
async function riportaDaConfermare() {
  const idInput = document.getElementById('mod-id');
  if (!idInput) return;
  
  const idPrenotazione = idInput.value;
  const statoLabel = document.getElementById('stato-attuale-label');
  const statoAttuale = statoLabel ? statoLabel.textContent : '';
  
  if (!idPrenotazione) {
    alert('⚠️ Nessuna prenotazione selezionata');
    return;
  }
  
  if (!confirm(`⚠️ ATTENZIONE: Annullare la conferma?\n\n${statoAttuale}\n\n⚠️ Questa azione:\n• Eliminerà il PDF generato\n• Riporterà lo stato a "Da confermare"\n\nContinuare?`)) {
    return;
  }
  
  showLoader(true);
  
  try {
    const payload = {
      action: 'unconfirm',
      idPrenotazione: idPrenotazione
    };
    
    const params = new URLSearchParams();
    params.append('payload', JSON.stringify(payload));
    
    const response = await fetch(ADMIN_CONFIG.endpoints.manageBooking, {
      method: 'POST',
      body: params,
      redirect: 'follow'
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert('✅ Conferma annullata: PDF eliminato e stato riportato a "Da confermare"');
      chiudiModifica();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await caricaPrenotazioni(new Date().getTime());
      console.log('🔄 Dashboard aggiornata dopo annullamento');
    } else {
      alert('❌ Errore: ' + (result.error || result.message || 'Sconosciuto'));
    }
  } catch (error) {
    console.error('Errore:', error);
    alert('❌ Errore durante l\'operazione: ' + error.message);
  } finally {
    showLoader(false);
  }
}

// ========== ELIMINA PRENOTAZIONE ==========
async function eliminaPrenotazione() {
  const idInput = document.getElementById('mod-id');
  const nomeInput = document.getElementById('mod-nome');
  
  if (!idInput) return;
  
  const idPrenotazione = idInput.value;
  const nomeCliente = nomeInput ? nomeInput.value : '';
  
  if (!idPrenotazione) {
    alert('⚠️ Nessuna prenotazione selezionata');
    return;
  }
  
  if (!confirm(`⚠️ ATTENZIONE!\n\nStai per ELIMINARE definitivamente la prenotazione:\n\n📋 ID: ${idPrenotazione}\n👤 Cliente: ${nomeCliente}\n\n❌ Questa azione NON può essere annullata.\n\nSei sicuro di voler procedere?`)) {
    return;
  }
  
  if (!confirm('🚨 ULTIMA CONFERMA\n\nConfermi l\'eliminazione DEFINITIVA?')) {
    return;
  }
  
  showLoader(true);
  
  try {
    const payload = {
      action: 'delete',
      idPrenotazione: idPrenotazione
    };
    
    const params = new URLSearchParams();
    params.append('payload', JSON.stringify(payload));
    
    const response = await fetch(ADMIN_CONFIG.endpoints.manageBooking, {
      method: 'POST',
      body: params,
      redirect: 'follow'
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert('✅ Prenotazione eliminata con successo');
      chiudiModifica();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await caricaPrenotazioni(new Date().getTime());
      console.log('🗑️ Prenotazione eliminata e dashboard aggiornata');
    } else {
      alert('❌ Errore eliminazione: ' + (result.error || result.message || 'Sconosciuto'));
    }
  } catch (error) {
    console.error('Errore eliminazione:', error);
    alert('❌ Errore durante l\'eliminazione: ' + error.message);
  } finally {
    showLoader(false);
  }
}

// ========== SALVA MODIFICHE ==========
async function salvaModifica() {
  const idInput = document.getElementById('mod-id');
  if (!idInput) return;
  
  const idPrenotazione = idInput.value;
  
  if (!idPrenotazione) {
    alert('⚠️ ID prenotazione mancante');
    return;
  }
  
  showLoader(true);
  
  try {
    const getValueOrEmpty = (id) => {
      const element = document.getElementById(id);
      return element ? element.value : '';
    };
    
    const payload = {
      action: 'update',
      idPrenotazione: idPrenotazione,
      'Nome': getValueOrEmpty('mod-nome'),
      'Luogo di nascita': getValueOrEmpty('mod-luogo-nascita'),
      'Data di nascita': getValueOrEmpty('mod-data-nascita'),
      'Codice fiscale': getValueOrEmpty('mod-cf'),
      'Cellulare': getValueOrEmpty('mod-cellulare'),
      'Comune di residenza': getValueOrEmpty('mod-comune-residenza'),
      'Via di residenza': getValueOrEmpty('mod-via-residenza'),
      'Civico di residenza': getValueOrEmpty('mod-civico-residenza'),
      'Numero di patente': getValueOrEmpty('mod-numero-patente'),
      'Data inizio validità patente': getValueOrEmpty('mod-data-inizio-patente'),
      'Scadenza patente': getValueOrEmpty('mod-scadenza-patente'),
      'Targa': getValueOrEmpty('mod-targa'),
      'Giorno inizio noleggio': getValueOrEmpty('mod-data-inizio'),
      'Ora inizio noleggio': getValueOrEmpty('mod-ora-inizio'),
      'Giorno fine noleggio': getValueOrEmpty('mod-data-fine'),
      'Ora fine noleggio': getValueOrEmpty('mod-ora-fine')
    };
    
    const params = new URLSearchParams();
    params.append('payload', JSON.stringify(payload));
    
    const response = await fetch(ADMIN_CONFIG.endpoints.manageBooking, {
      method: 'POST',
      body: params,
      redirect: 'follow'
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert('✅ Modifiche salvate con successo');
      chiudiModifica();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await caricaPrenotazioni(new Date().getTime());
      console.log('✅ Prenotazione aggiornata e dashboard ricaricata');
    } else {
      alert('❌ Errore salvataggio: ' + (result.error || result.message || 'Sconosciuto'));
    }
  } catch (error) {
    console.error('Errore salvataggio:', error);
    alert('❌ Errore durante il salvataggio: ' + error.message);
  } finally {
    showLoader(false);
  }
}

// ========== EXPORT CSV ==========
function esportaCSV() {
  let csv = 'ID;Cliente;CF;Veicolo;Dal;Al;Cellulare;Stato;Importo\n';
  
  prenotazioni.forEach(p => {
    const dalCompleto = (p.giornoInizio || '') + ' ' + (p.oraInizio || '');
    const alCompleto = (p.giornoFine || '') + ' ' + (p.oraFine || '');
    
    csv += `"${sanitizeHTML(p.idPrenotazione)}";"${sanitizeHTML(p.nome)}";"${sanitizeHTML(p.cf)}";"${sanitizeHTML(p.targa)}";"${dalCompleto}";"${alCompleto}";"${sanitizeHTML(p.cellulare)}";"${sanitizeHTML(p.stato)}";"${sanitizeHTML(p.importo)}"\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', 'prenotazioni_' + new Date().toISOString().split('T')[0] + '.csv');
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ========== DIAGNOSTICA ==========
window.adminDebug = function() {
  console.group('🔧 Diagnostica Admin Dashboard');
  console.log('Versione:', ADMIN_VERSION);
  console.log('Build:', ADMIN_BUILD_DATE);
  console.log('Prenotazioni caricate:', prenotazioni.length);
  console.log('Filtro attivo:', filtroAttivoStat);
  console.log('Ordinamento:', ordinamentoAttuale);
  console.log('Backend connesso:', !!ADMIN_CONFIG.endpoints.adminPrenotazioni);
  console.log('Security Features:', 'Rate Limiting + XSS Protection');
  
  if (prenotazioni.length > 0) {
    const stats = {
      totali: prenotazioni.length,
      daConfermare: prenotazioni.filter(p => p.stato === 'Da confermare').length,
      future: prenotazioni.filter(p => p.stato === 'Futura').length,
      inCorso: prenotazioni.filter(p => p.stato === 'In corso').length,
      completate: prenotazioni.filter(p => p.stato === 'Completato').length
    };
    console.table(stats);
  }
  
  console.groupEnd();
};

console.log('%c💡 Tip: Digita adminDebug() nella console per diagnostica completa', 'color: #999; font-style: italic;');

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('adminLoggedIn') === 'true') {
    const loginOverlay = document.getElementById('loginOverlay');
    const dashboardContent = document.getElementById('dashboardContent');
    
    if (loginOverlay) loginOverlay.style.display = 'none';
    if (dashboardContent) dashboardContent.style.display = 'block';
    
    caricaPrenotazioni();
  }
  
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      tentaLoginAdmin();
    });
  }
  
  console.log('✅ Admin Dashboard v' + ADMIN_VERSION + ' caricata con Security Features');
});
