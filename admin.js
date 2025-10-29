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

'use strict';

const ADMIN_VERSION = '2.8';
const ADMIN_BUILD_DATE = '2025-10-29';

console.log('%c Admin Dashboard v' + ADMIN_VERSION, 'font-size: 16px; font-weight: bold; color: #667eea');
console.log('%c Build: ' + ADMIN_BUILD_DATE + ' | Stati Dinamici Attivi', 'color: #666');
console.log('%c Gestione prenotazioni completa', 'color: #22c55e');

// ========== CONFIGURAZIONE ==========
const ADMIN_CONFIG = {
  password: 'Imbriani2025+', // ⚠️ TODO: Implementare autenticazione server-side con Google OAuth
  endpoints: {
    adminPrenotazioni: 'https://script.google.com/macros/s/AKfycbz7y_JsC0LaFW61xSotLQ1utSbqHDM6dSnfZ-2M0sCa97DeX4xeEeGDgwThCLpXXz8/exec',
    manageBooking: 'https://script.google.com/macros/s/AKfycbxAKX12Sgc0ODvGtUEXCRoINheSeO9-SgDNGuY1QtrVKBENdY0SpMiDtzgoxIBRCuQ/exec'
  }
};

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
  
  const remaining = 5 - (attempts + 1);
  if (remaining > 0) {
    console.warn(`⚠️ Login fallito. Tentativi rimasti: ${remaining}`);
  }
}

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
  
  const password = document.getElementById('passwordInput').value;
  
  if (password === ADMIN_CONFIG.password) {
    sessionStorage.setItem('admin_logged', 'true');
    resetLoginAttempts();
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('loginError').style.display = 'none';
    caricaPrenotazioni();
    console.log('✅ Login admin riuscito');
  } else {
    registerFailedLogin();
    mostraErroreLogin('Password errata!');
    document.getElementById('passwordInput').value = '';
    document.getElementById('passwordInput').focus();
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
    
    return matchSearch && matchStato && matchVeicolo;
  });
  
  popolaTabella(filtrate);
}

function applicaFiltroDashboard(tipo) {
  filtroAttivoStat = tipo;
  
  // Aggiorna stili card
  document.querySelectorAll('.stat-card').forEach(card => card.classList.remove('active'));
  document.getElementById('filter-' + tipo).classList.add('active');
  
  // Applica filtro
  document.getElementById('filtroStato').value = tipo === 'totali' ? '' : 
    tipo === 'completate' ? 'Completato' :
    tipo === 'daconfermare' ? 'Da confermare' :
    tipo === 'corso' ? 'In corso' :
    tipo === 'future' ? 'Futura' : '';
  
  applicaFiltri();
}

// ========== TABELLA ========== 
function popolaTabella(datoiFiltrati = null) {
  const tbody = document.querySelector('#tabellaPrenotazioni tbody');
  tbody.innerHTML = '';
  
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
  dettagli.innerHTML = '';
  
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
}

function chiudiModalConferma() {
  document.getElementById('modalConferma').style.display = 'none';
  prenotazioneDaConfermare = null;
}

async function confermaPrenotazione() {
  if (!prenotazioneDaConfermare) return;
  
  const importo = document.getElementById('conferma-importo').value.trim();
  
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
    
    if (data.success) {
      alert('✅ Prenotazione confermata!');
      chiudiModalConferma();
      caricaPrenotazioni(true);
    } else {
      alert('❌ Errore: ' + data.message);
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
      alert('❌ Errore: ' + data.message);
    }
    
  } catch (error) {
    console.error('❌ Errore annullamento:', error);
    alert('Errore di rete');
  } finally {
    mostraLoader(false);
  }
}

// ========== MODAL MODIFICA ==========
function apriModalModifica(prenotazione) {
  // Popola campi modal (simplified - non uso innerHTML)
  document.getElementById('mod-id').value = prenotazione.idPrenotazione;
  document.getElementById('mod-nome').value = prenotazione.cliente;
  document.getElementById('mod-cellulare').value = prenotazione.cellulare;
  
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
    
    if (data.success) {
      alert('✅ Prenotazione eliminata');
      caricaPrenotazioni(true);
    } else {
      alert('❌ Errore: ' + data.message);
    }
    
  } catch (error) {
    console.error('❌ Errore eliminazione:', error);
    alert('Errore di rete');
  } finally {
    mostraLoader(false);
  }
}

// ========== UTILITY ==========
function mostraLoader(show) {
  document.getElementById('loader').style.display = show ? 'flex' : 'none';
}
