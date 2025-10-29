<<<<<<< HEAD
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
=======
// Imbriani Noleggio - admin.js v2.8
// FIX v2.8 - 29 Ottobre 2025 12:47 CET:
// ✅ XSS Protection: sanitizzazione innerHTML (4 fix)
// ✅ Rate Limiting: max 5 tentativi login / 15 minuti
// ✅ Funzioni sanitizeHTML e rate limit utils
// ✅ Login sicuro con blocco automatico
//
// CHANGELOG - DASHBOARD ADMIN v2.7:
// - Action "unconfirm" implementata
// - Annulla conferma + Elimina PDF + Stato "Da confermare"
// - Auto-refresh dashboard dopo annullamento
// - Stati dinamici: Futura, In corso, Completato
>>>>>>> 5780dee314f1fa0a5e677b0c92cbfc32a9be8c60

'use strict';

<<<<<<< HEAD
const ADMIN_VERSION = '2.7.1';
=======
const ADMIN_VERSION = '2.8';
>>>>>>> 5780dee314f1fa0a5e677b0c92cbfc32a9be8c60
const ADMIN_BUILD_DATE = '2025-10-29';

<<<<<<< HEAD
console.log(`%c🔐 Admin Dashboard v${ADMIN_VERSION}`, 'font-size: 16px; font-weight: bold; color: #667eea;');
console.log(`%c📅 Build: ${ADMIN_BUILD_DATE} | Security Hardened 🛡️`, 'color: #666;');
console.log(`%c✨ Gestione prenotazioni completa`, 'color: #22c55e;');
=======
console.log('%c Admin Dashboard v' + ADMIN_VERSION, 'font-size: 16px; font-weight: bold; color: #667eea');
console.log('%c Build: ' + ADMIN_BUILD_DATE + ' | Stati Dinamici Attivi', 'color: #666');
console.log('%c Gestione prenotazioni completa', 'color: #22c55e');
>>>>>>> 5780dee314f1fa0a5e677b0c92cbfc32a9be8c60

// ========== CONFIGURAZIONE ==========
const ADMIN_CONFIG = {
  password: 'Imbriani2025+', // ⚠️ TODO: Implementare autenticazione server-side con Google OAuth
  endpoints: {
    adminPrenotazioni: 'https://script.google.com/macros/s/AKfycbz7y_JsC0LaFW61xSotLQ1utSbqHDM6dSnfZ-2M0sCa97DeX4xeEeGDgwThCLpXXz8/exec',
    manageBooking: 'https://script.google.com/macros/s/AKfycbxAKX12Sgc0ODvGtUEXCRoINheSeO9-SgDNGuY1QtrVKBENdY0SpMiDtzgoxIBRCuQ/exec'
  }
};

<<<<<<< HEAD
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
=======
// ========== SECURITY: XSS PROTECTION & RATE LIMITING ==========
/**
 * Sanitizza stringa per prevenire XSS
 * @param {string} str - Stringa da sanitizzare
 * @return {string} Stringa sicura per HTML
 */
function sanitizeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
>>>>>>> 5780dee314f1fa0a5e677b0c92cbfc32a9be8c60
}

/**
 * Rate limiting per login admin
 * @return {Object} { allowed: boolean, message: string, remainingTime: number }
 */
function checkLoginRateLimit() {
  const now = Date.now();
  const key = 'admin_login_attempts';
  const lockKey = 'admin_login_lock';
  const timeKey = 'admin_login_lock_time';
  
  // Controlla se bloccato
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
      // Sblocca dopo 15 minuti
      localStorage.removeItem(lockKey);
      localStorage.removeItem(timeKey);
      localStorage.setItem(key, '0');
    }
  }
  
  // Conta tentativi
  const attempts = parseInt(localStorage.getItem(key) || '0');
  
  if (attempts >= 5) {
    // Blocca
    localStorage.setItem(lockKey, 'true');
    localStorage.setItem(timeKey, now.toString());
    return {
      allowed: false,
      message: 'Troppi tentativi errati. Account bloccato per 15 minuti.',
      remainingTime: 15
    };
  }
  
  return {
    allowed: true,
    message: '',
    remainingTime: 0
  };
}

/**
 * Registra tentativo di login fallito
 */
function registerFailedLogin() {
  const key = 'admin_login_attempts';
  const attempts = parseInt(localStorage.getItem(key) || '0');
  localStorage.setItem(key, (attempts + 1).toString());
  
<<<<<<< HEAD
  if (statoReale === 'Da confermare') {
    return statoReale;
=======
  const remaining = 5 - (attempts + 1);
  if (remaining > 0) {
    console.warn(`⚠️ Login fallito. Tentativi rimasti: ${remaining}`);
>>>>>>> 5780dee314f1fa0a5e677b0c92cbfc32a9be8c60
  }
<<<<<<< HEAD
  
  return statoReale;
=======
>>>>>>> 5780dee314f1fa0a5e677b0c92cbfc32a9be8c60
}

<<<<<<< HEAD
function convertiDataPerFiltro(dataStr) {
  if (!dataStr) return null;
=======
/**
 * Reset contatore tentativi login dopo successo
 */
function resetLoginAttempts() {
  localStorage.setItem('admin_login_attempts', '0');
  localStorage.removeItem('admin_login_lock');
  localStorage.removeItem('admin_login_lock_time');
  console.log('✅ Tentativi login resettati');
}

console.log('🛡️ XSS Protection & Rate Limiting attivo - admin.js v2.8');

// ========== STATE ==========
let prenotazioni = [];
let prenotazioneDaConfermare = null;
let filtroAttivoStat = 'totali';
let ordinamentoAttuale = { campo: 'dataRitiro', direzione: 'desc' };

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
  console.log('📊 Dashboard Admin inizializzata');
>>>>>>> 5780dee314f1fa0a5e677b0c92cbfc32a9be8c60
  
  // Check login
  const isLogged = sessionStorage.getItem('admin_logged');
  
  if (isLogged === 'true') {
    document.getElementById('loginOverlay').style.display = 'none';
    caricaPrenotazioni();
  } else {
    document.getElementById('loginOverlay').style.display = 'flex';
  }
  
  // Event listeners
  document.getElementById('loginBtn').addEventListener('click', verificaPassword);
  document.getElementById('passwordInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') verificaPassword();
  });
  
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('refreshBtn').addEventListener('click', () => caricaPrenotazioni(true));
  
  // Modal events
  document.getElementById('closeModalConferma').addEventListener('click', chiudiModalConferma);
  document.getElementById('closeModalModifica').addEventListener('click', chiudiModalModifica);
  
  document.getElementById('confermaBtn').addEventListener('click', confermaPrenotazione);
  document.getElementById('salvaModificheBtn').addEventListener('click', salvaModifiche);
  
  // Filtri search
  document.getElementById('searchInput').addEventListener('input', applicaFiltri);
  document.getElementById('filtroStato').addEventListener('change', applicaFiltri);
  document.getElementById('filtroVeicolo').addEventListener('change', applicaFiltri);
});

// ========== LOGIN ==========
function verificaPassword() {
  // Controlla rate limiting
  const rateLimitCheck = checkLoginRateLimit();
  
  if (!rateLimitCheck.allowed) {
    mostraErroreLogin(rateLimitCheck.message);
    document.getElementById('passwordInput').disabled = true;
    document.getElementById('loginBtn').disabled = true;
    
    // Countdown per sblocco
    let remaining = rateLimitCheck.remainingTime;
    const countdown = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(countdown);
        document.getElementById('passwordInput').disabled = false;
        document.getElementById('loginBtn').disabled = false;
        document.getElementById('loginError').style.display = 'none';
      } else {
        mostraErroreLogin(`Troppi tentativi. Riprova tra ${remaining} minuti.`);
      }
    }, 60000); // Aggiorna ogni minuto
    
    return;
  }
  
<<<<<<< HEAD
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
=======
  const password = document.getElementById('passwordInput').value;
>>>>>>> 5780dee314f1fa0a5e677b0c92cbfc32a9be8c60
  
<<<<<<< HEAD
  if (passwordInserita === ADMIN_CONFIG.password) {
    // Password corretta - reset tentativi
    resetLoginAttempts();
    
    sessionStorage.setItem('adminLoggedIn', 'true');
=======
  if (password === ADMIN_CONFIG.password) {
    sessionStorage.setItem('admin_logged', 'true');
    resetLoginAttempts();
>>>>>>> 5780dee314f1fa0a5e677b0c92cbfc32a9be8c60
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('loginError').style.display = 'none';
    caricaPrenotazioni();
    console.log('✅ Login admin riuscito');
  } else {
<<<<<<< HEAD
    // Password errata - registra tentativo
    registerFailedLogin();
    
    loginError.textContent = 'Password errata!';
    loginError.style.display = 'block';
=======
    registerFailedLogin();
    mostraErroreLogin('Password errata!');
    document.getElementById('passwordInput').value = '';
    document.getElementById('passwordInput').focus();
>>>>>>> 5780dee314f1fa0a5e677b0c92cbfc32a9be8c60
  }
}

function mostraErroreLogin(messaggio) {
  const errorDiv = document.getElementById('loginError');
  errorDiv.textContent = sanitizeHTML(messaggio);
  errorDiv.style.display = 'block';
}

function logout() {
  sessionStorage.removeItem('admin_logged');
  document.getElementById('loginOverlay').style.display = 'flex';
  document.getElementById('passwordInput').value = '';
  prenotazioni = [];
  document.querySelector('#tabellaPrenotazioni tbody').innerHTML = '';
  console.log('👋 Logout effettuato');
}

// ========== CARICAMENTO PRENOTAZIONI ==========
async function caricaPrenotazioni(force = false) {
  try {
    mostraLoader(true);
    
    const url = ADMIN_CONFIG.endpoints.adminPrenotazioni + '?action=list' + (force ? '&_=' + Date.now() : '');
    
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors'
    });
    
    if (!response.ok) {
      throw new Error('Errore HTTP: ' + response.status);
    }
    
    const data = await response.json();
    
    if (data.success) {
      prenotazioni = data.prenotazioni || [];
      console.log(`✅ Caricate ${prenotazioni.length} prenotazioni`);
      
      aggiornaStatistiche();
      popolaFiltri();
      popolaTabella();
    } else {
      console.error('❌ Errore caricamento:', data.message);
      alert('Errore caricamento prenotazioni: ' + data.message);
    }
    
  } catch (error) {
    console.error('❌ Errore fetch prenotazioni:', error);
    alert('Errore di connessione. Riprova.');
  } finally {
    mostraLoader(false);
  }
}

// ========== STATISTICHE ==========
function aggiornaStatistiche() {
  const stats = {
    totali: prenotazioni.length,
    completate: prenotazioni.filter(p => p.stato === 'Completato').length,
    daConfermare: prenotazioni.filter(p => p.stato === 'Da confermare').length,
    corso: prenotazioni.filter(p => p.stato === 'In corso').length,
    future: prenotazioni.filter(p => p.stato === 'Futura').length
  };
  
  document.getElementById('stat-totali').textContent = stats.totali;
  document.getElementById('stat-completate').textContent = stats.completate;
  document.getElementById('stat-daconfermare').textContent = stats.daConfermare;
  document.getElementById('stat-corso').textContent = stats.corso;
  document.getElementById('stat-future').textContent = stats.future;
}

// ========== FILTRI ==========
function popolaFiltri() {
  // Popola filtro veicoli unici
  const veicoli = [...new Set(prenotazioni.map(p => p.pulmino).filter(Boolean))];
  const selectVeicolo = document.getElementById('filtroVeicolo');
  
  selectVeicolo.innerHTML = '<option value="">Tutti i veicoli</option>';
  veicoli.forEach(veicolo => {
    const option = document.createElement('option');
    option.value = veicolo;
    option.textContent = sanitizeHTML(veicolo);
    selectVeicolo.appendChild(option);
  });
}

function applicaFiltri() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const filtroStato = document.getElementById('filtroStato').value;
  const filtroVeicolo = document.getElementById('filtroVeicolo').value;
  
  const filtrate = prenotazioni.filter(p => {
    const matchSearch = !searchTerm || 
      p.cliente.toLowerCase().includes(searchTerm) ||
      p.idPrenotazione.toLowerCase().includes(searchTerm) ||
      p.cellulare.includes(searchTerm);
    
    const matchStato = !filtroStato || p.stato === filtroStato;
    const matchVeicolo = !filtroVeicolo || p.pulmino === filtroVeicolo;
    
<<<<<<< HEAD
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
=======
    return matchSearch && matchStato && matchVeicolo;
>>>>>>> 5780dee314f1fa0a5e677b0c92cbfc32a9be8c60
  });
  
  popolaTabella(filtrate);
}

<<<<<<< HEAD
function getNomePulmino(targa) {
  if (targa === 'EC787NM') return 'Ducato Lungo';
  if (targa === 'DN391FW') return 'Ducato Corto';
  if (targa === 'DL291XZ') return 'Peugeot';
  return sanitizeHTML(targa);
}

// ========== FILTRI ==========
=======
>>>>>>> 5780dee314f1fa0a5e677b0c92cbfc32a9be8c60
function applicaFiltroDashboard(tipo) {
  filtroAttivoStat = tipo;
  
<<<<<<< HEAD
  document.querySelectorAll('.stat-card').forEach(card => {
    card.classList.remove('active');
  });
=======
  // Aggiorna stili card
  document.querySelectorAll('.stat-card').forEach(card => card.classList.remove('active'));
  document.getElementById('filter-' + tipo).classList.add('active');
>>>>>>> 5780dee314f1fa0a5e677b0c92cbfc32a9be8c60
  
<<<<<<< HEAD
  const filterCard = document.getElementById('filter-' + tipo);
  if (filterCard) {
    filterCard.classList.add('active');
  }
  
  let prenotazioniFiltrate = [];
=======
  // Applica filtro
  document.getElementById('filtroStato').value = tipo === 'totali' ? '' : 
    tipo === 'completate' ? 'Completato' :
    tipo === 'daconfermare' ? 'Da confermare' :
    tipo === 'corso' ? 'In corso' :
    tipo === 'future' ? 'Futura' : '';
>>>>>>> 5780dee314f1fa0a5e677b0c92cbfc32a9be8c60
  
  applicaFiltri();
}

<<<<<<< HEAD
function applicaFiltri() {
  const dataInizio = document.getElementById('filter-data-inizio')?.value;
  const dataFine = document.getElementById('filter-data-fine')?.value;
  const pulmino = document.getElementById('filter-pulmino')?.value;
  const stato = document.getElementById('filter-stato')?.value;
=======
// ========== TABELLA ========== 
function popolaTabella(datoiFiltrati = null) {
  const tbody = document.querySelector('#tabellaPrenotazioni tbody');
  tbody.innerHTML = '';
>>>>>>> 5780dee314f1fa0a5e677b0c92cbfc32a9be8c60
  
  const dati = datoiFiltrati || prenotazioni;
  
  if (dati.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 7;
    td.style.textAlign = 'center';
    td.style.padding = '20px';
    td.textContent = 'Nessuna prenotazione trovata';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  
  dati.forEach(prenotazione => {
    const tr = document.createElement('tr');
    
    // ID Prenotazione
    const tdId = document.createElement('td');
    tdId.textContent = sanitizeHTML(prenotazione.idPrenotazione);
    tr.appendChild(tdId);
    
    // Cliente
    const tdCliente = document.createElement('td');
    tdCliente.textContent = sanitizeHTML(prenotazione.cliente);
    tr.appendChild(tdCliente);
    
    // Cellulare
    const tdCell = document.createElement('td');
    tdCell.textContent = sanitizeHTML(prenotazione.cellulare);
    tr.appendChild(tdCell);
    
    // Date
    const tdDate = document.createElement('td');
    tdDate.textContent = `${sanitizeHTML(prenotazione.dataRitiro)} → ${sanitizeHTML(prenotazione.dataConsegna)}`;
    tr.appendChild(tdDate);
    
    // Veicolo
    const tdVeicolo = document.createElement('td');
    tdVeicolo.textContent = sanitizeHTML(prenotazione.pulmino);
    tr.appendChild(tdVeicolo);
    
    // Stato
    const tdStato = document.createElement('td');
    const spanStato = document.createElement('span');
    spanStato.className = 'badge badge-' + getBadgeClass(prenotazione.stato);
    spanStato.textContent = sanitizeHTML(prenotazione.stato);
    tdStato.appendChild(spanStato);
    tr.appendChild(tdStato);
    
    // Azioni
    const tdAzioni = document.createElement('td');
    tdAzioni.className = 'azioni';
    
    if (prenotazione.stato === 'Da confermare') {
      const btnConferma = document.createElement('button');
      btnConferma.className = 'btn-azione btn-conferma';
      btnConferma.title = 'Conferma prenotazione';
      btnConferma.textContent = '✓';
      btnConferma.onclick = () => apriModalConferma(prenotazione);
      tdAzioni.appendChild(btnConferma);
    } else {
      const btnAnnulla = document.createElement('button');
      btnAnnulla.className = 'btn-azione btn-annulla';
      btnAnnulla.title = 'Riporta a Da confermare';
      btnAnnulla.textContent = '↩';
      btnAnnulla.onclick = () => annullaConferma(prenotazione.idPrenotazione);
      tdAzioni.appendChild(btnAnnulla);
    }
    
    const btnModifica = document.createElement('button');
    btnModifica.className = 'btn-azione btn-modifica';
    btnModifica.title = 'Modifica';
    btnModifica.textContent = '✎';
    btnModifica.onclick = () => apriModalModifica(prenotazione);
    tdAzioni.appendChild(btnModifica);
    
    const btnElimina = document.createElement('button');
    btnElimina.className = 'btn-azione btn-elimina';
    btnElimina.title = 'Elimina';
    btnElimina.textContent = '🗑';
    btnElimina.onclick = () => eliminaPrenotazione(prenotazione.idPrenotazione);
    tdAzioni.appendChild(btnElimina);
    
    tr.appendChild(tdAzioni);
    tbody.appendChild(tr);
  });
}

function getBadgeClass(stato) {
  const map = {
    'Da confermare': 'warning',
    'Futura': 'info',
    'In corso': 'success',
    'Completato': 'secondary'
  };
  return map[stato] || 'default';
}

// ========== MODAL CONFERMA ==========
function apriModalConferma(prenotazione) {
  prenotazioneDaConfermare = prenotazione;
  
  const dettagli = document.getElementById('conferma-dettagli');
<<<<<<< HEAD
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
=======
  dettagli.innerHTML = '';
>>>>>>> 5780dee314f1fa0a5e677b0c92cbfc32a9be8c60
  
<<<<<<< HEAD
  const modal = document.getElementById('modalConferma');
  if (modal) {
    modal.classList.add('active');
  }
=======
  const info = [
    { label: 'ID', value: prenotazione.idPrenotazione },
    { label: 'Cliente', value: prenotazione.cliente },
    { label: 'Dal', value: prenotazione.dataRitiro },
    { label: 'Al', value: prenotazione.dataConsegna },
    { label: 'Veicolo', value: prenotazione.pulmino }
  ];
  
  info.forEach(item => {
    const p = document.createElement('p');
    const strong = document.createElement('strong');
    strong.textContent = item.label + ': ';
    p.appendChild(strong);
    p.appendChild(document.createTextNode(sanitizeHTML(item.value)));
    dettagli.appendChild(p);
  });
  
  document.getElementById('conferma-importo').value = '';
  document.getElementById('modalConferma').style.display = 'flex';
>>>>>>> 5780dee314f1fa0a5e677b0c92cbfc32a9be8c60
}

function chiudiModalConferma() {
<<<<<<< HEAD
  const modal = document.getElementById('modalConferma');
  if (modal) {
    modal.classList.remove('active');
  }
  
  const importoInput = document.getElementById('conferma-importo');
  if (importoInput) {
    importoInput.value = '';
  }
  
=======
  document.getElementById('modalConferma').style.display = 'none';
>>>>>>> 5780dee314f1fa0a5e677b0c92cbfc32a9be8c60
  prenotazioneDaConfermare = null;
}

async function confermaPrenotazione() {
  if (!prenotazioneDaConfermare) return;
  
  const importoInput = document.getElementById('conferma-importo');
  if (!importoInput) return;
  
  const importo = importoInput.value.trim();
  
  if (!importo) {
    alert('Inserisci un importo');
    return;
  }
  
  try {
    mostraLoader(true);
    
    const payload = {
      action: 'confirm',
      idPrenotazione: prenotazioneDaConfermare.idPrenotazione,
      importo: importo
    };
    
    const response = await fetch(ADMIN_CONFIG.endpoints.manageBooking, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'payload=' + encodeURIComponent(JSON.stringify(payload))
    });
    
    const data = await response.json();
    
<<<<<<< HEAD
    if (result.success) {
      alert('✅ Prenotazione confermata e PDF generato con successo!');
=======
    if (data.success) {
      alert('✅ Prenotazione confermata!');
>>>>>>> 5780dee314f1fa0a5e677b0c92cbfc32a9be8c60
      chiudiModalConferma();
<<<<<<< HEAD
      await new Promise(resolve => setTimeout(resolve, 1000));
      const cacheBuster = new Date().getTime();
      await caricaPrenotazioni(cacheBuster);
      console.log('🔄 Dashboard aggiornata automaticamente');
=======
      caricaPrenotazioni(true);
>>>>>>> 5780dee314f1fa0a5e677b0c92cbfc32a9be8c60
    } else {
<<<<<<< HEAD
      alert('❌ Errore: ' + (result.error || result.message || 'Sconosciuto'));
=======
      alert('❌ Errore: ' + data.message);
>>>>>>> 5780dee314f1fa0a5e677b0c92cbfc32a9be8c60
    }
    
  } catch (error) {
    console.error('❌ Errore conferma:', error);
    alert('Errore di rete');
  } finally {
    mostraLoader(false);
  }
}

// ========== ANNULLA CONFERMA ==========
async function annullaConferma(idPrenotazione) {
  if (!confirm('Vuoi riportare questa prenotazione a "Da confermare"? Il PDF verrà eliminato.')) {
    return;
  }
  
  try {
    mostraLoader(true);
    
    const payload = {
      action: 'unconfirm',
      idPrenotazione: idPrenotazione
    };
    
    const response = await fetch(ADMIN_CONFIG.endpoints.manageBooking, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'payload=' + encodeURIComponent(JSON.stringify(payload))
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('✅ Conferma annullata, stato ripristinato a "Da confermare"');
      caricaPrenotazioni(true);
    } else {
<<<<<<< HEAD
      alert('❌ Errore: ' + (result.error || result.message || 'Sconosciuto'));
=======
      alert('❌ Errore: ' + data.message);
>>>>>>> 5780dee314f1fa0a5e677b0c92cbfc32a9be8c60
    }
    
  } catch (error) {
    console.error('❌ Errore annullamento:', error);
    alert('Errore di rete');
  } finally {
    mostraLoader(false);
  }
}

<<<<<<< HEAD
// ========== ELIMINA PRENOTAZIONE ==========
async function eliminaPrenotazione() {
  const idInput = document.getElementById('mod-id');
  const nomeInput = document.getElementById('mod-nome');
=======
// ========== MODAL MODIFICA ==========
function apriModalModifica(prenotazione) {
  // Popola campi modal (simplified - non uso innerHTML)
  document.getElementById('mod-id').value = prenotazione.idPrenotazione;
  document.getElementById('mod-nome').value = prenotazione.cliente;
  document.getElementById('mod-cellulare').value = prenotazione.cellulare;
>>>>>>> 5780dee314f1fa0a5e677b0c92cbfc32a9be8c60
  
<<<<<<< HEAD
  if (!idInput) return;
  
  const idPrenotazione = idInput.value;
  const nomeCliente = nomeInput ? nomeInput.value : '';
  
  if (!idPrenotazione) {
    alert('⚠️ Nessuna prenotazione selezionata');
=======
  document.getElementById('modalModifica').style.display = 'flex';
}

function chiudiModalModifica() {
  document.getElementById('modalModifica').style.display = 'none';
}

async function salvaModifiche() {
  // Implementazione salvataggio modifiche
  alert('Funzionalità modifica in sviluppo');
  chiudiModalModifica();
}

// ========== ELIMINA PRENOTAZIONE ==========
async function eliminaPrenotazione(idPrenotazione) {
  if (!confirm('Sei sicuro di voler eliminare questa prenotazione?')) {
>>>>>>> 5780dee314f1fa0a5e677b0c92cbfc32a9be8c60
    return;
  }
  
  try {
    mostraLoader(true);
    
    const payload = {
      action: 'delete',
      idPrenotazione: idPrenotazione
    };
    
    const response = await fetch(ADMIN_CONFIG.endpoints.manageBooking, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'payload=' + encodeURIComponent(JSON.stringify(payload))
    });
    
    const data = await response.json();
    
<<<<<<< HEAD
    if (result.success) {
      alert('✅ Prenotazione eliminata con successo');
      chiudiModifica();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await caricaPrenotazioni(new Date().getTime());
      console.log('🗑️ Prenotazione eliminata e dashboard aggiornata');
=======
    if (data.success) {
      alert('✅ Prenotazione eliminata');
      caricaPrenotazioni(true);
>>>>>>> 5780dee314f1fa0a5e677b0c92cbfc32a9be8c60
    } else {
<<<<<<< HEAD
      alert('❌ Errore eliminazione: ' + (result.error || result.message || 'Sconosciuto'));
=======
      alert('❌ Errore: ' + data.message);
>>>>>>> 5780dee314f1fa0a5e677b0c92cbfc32a9be8c60
    }
<<<<<<< HEAD
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
=======
>>>>>>> 5780dee314f1fa0a5e677b0c92cbfc32a9be8c60
    
<<<<<<< HEAD
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
=======
>>>>>>> 5780dee314f1fa0a5e677b0c92cbfc32a9be8c60
  } catch (error) {
    console.error('❌ Errore eliminazione:', error);
    alert('Errore di rete');
  } finally {
    mostraLoader(false);
  }
}

<<<<<<< HEAD
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
=======
// ========== UTILITY ==========
function mostraLoader(show) {
  document.getElementById('loader').style.display = show ? 'flex' : 'none';
>>>>>>> 5780dee314f1fa0a5e677b0c92cbfc32a9be8c60
}

<<<<<<< HEAD
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

=======
>>>>>>> 5780dee314f1fa0a5e677b0c92cbfc32a9be8c60