/* Imbriani Noleggio – admin.js
   
   ═══════════════════════════════════════════════════════════════════
   CHANGELOG - DASHBOARD ADMIN
   ═══════════════════════════════════════════════════════════════════
   
   📌 v2.2 - 28 Ottobre 2025 22:49 CET
   🔧 Auto-refresh dashboard dopo conferma prenotazione
   🔧 Delay 1s + cache busting per garantire aggiornamento visibile
   🔧 Chiusura automatica modal dopo conferma
   
   📌 v2.1 - 28 Ottobre 2025
   🔧 Fix mostra date + orari in tabella e modal
   🔧 Fix card statistiche "Da Confermare"
   🔧 Fix export CSV con separatore punto e virgola (;)
   🔧 Fix filtro dashboard per "Da Confermare"
   
   📌 v2.0 - 28 Ottobre 2025
   ✅ Dashboard amministrativa completa
   ✅ Sistema conferma prenotazioni con generazione PDF
   ✅ Statistiche aggregate
   ✅ Filtri avanzati
   ✅ Ordinamento tabella
   ✅ Export CSV
   ✅ Login con password admin
   ✅ Responsive design
   
   ═══════════════════════════════════════════════════════════════════
*/

'use strict';

const ADMIN_VERSION = '2.3';
const ADMIN_BUILD_DATE = '2025-10-28';

console.log(`%c🔐 Admin Dashboard v${ADMIN_VERSION}`, 'font-size: 16px; font-weight: bold; color: #667eea;');
console.log(`%c📅 Build: ${ADMIN_BUILD_DATE} | Auto-refresh Attivo`, 'color: #666;');
console.log(`%c✨ Gestione prenotazioni completa`, 'color: #22c55e;');

// ========== CONFIGURAZIONE ==========
const ADMIN_CONFIG = {
  password: 'Imbriani2025+',
  endpoints: {
    adminPrenotazioni: 'https://script.google.com/macros/s/AKfycbz7y_JsC0LaFW61xSotLQ1utSbqHDM6dSnfZ2M0sCa97_DeX4xeEeGDgwThCLpXXz8/exec',
    manageBooking: 'https://script.google.com/macros/s/AKfycbxAKX12Sgc0ODvGtUEXCRoINheSeO9-SgDNGuY1QtrVKBENdY0SpMiDtzgoxIBRCuQ/exec'
  }
};

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
  
  // Se è già formato corretto dd/mm/yyyy
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataStr)) {
    return dataStr;
  }
  
  // Se è timestamp ISO o Date string
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
  
  // Se già formato HH:MM
  if (/^\d{2}:\d{2}$/.test(oraStr)) {
    return oraStr;
  }
  
  // Se è timestamp o Date string
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


// ========== LOGIN ==========
function tentaLoginAdmin() {
  const passwordInput = document.getElementById('passwordInput');
  const loginError = document.getElementById('loginError');
  
  if (!passwordInput || !loginError) return;
  
  const passwordInserita = passwordInput.value.trim();
  
  if (passwordInserita === ADMIN_CONFIG.password) {
    // ✅ Salva sessione
    sessionStorage.setItem('adminLoggedIn', 'true');
    
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('dashboardContent').style.display = 'block';
    loginError.style.display = 'none';
    
    caricaPrenotazioni();
  } else {
    loginError.style.display = 'block';
  }
}

function logout() {
  if (confirm('Vuoi uscire dalla dashboard?')) {
    // ✅ Rimuovi sessione
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
    // ✅ Cache busting per evitare dati vecchi
    let url = ADMIN_CONFIG.endpoints.adminPrenotazioni + '?action=list';
    
    if (cacheBuster) {
      url += '&t=' + cacheBuster;
    } else {
      url += '&t=' + new Date().getTime();
    }
    
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-cache' // ✅ Forza no-cache
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
  
  // Calcola future (confermata ma non ancora iniziate)
  const future = (stats.confermate || 0);
  document.getElementById('stat-future').textContent = future;
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
    
    // Badge stato
    let badgeStato = '';
    if (pren.stato === 'Da confermare') {
      badgeStato = '<span class="badge warning">⏳ Da confermare</span>';
    } else if (pren.stato === 'Confermata') {
      badgeStato = '<span class="badge success">✅ Confermata</span>';
    } else if (pren.stato === 'In corso') {
      badgeStato = '<span class="badge info">🚐 In corso</span>';
    } else if (pren.stato === 'Completato') {
      badgeStato = '<span class="badge" style="background: #e5e7eb; color: #374151;">✓ Completato</span>';
    } else {
      badgeStato = '<span class="badge info">' + pren.stato + '</span>';
    }
    
    // Pulsanti azioni
    let azioni = `
      <button class="btn-icon" onclick="apriModalModifica('${pren.idPrenotazione}')" title="Modifica">
        <span class="material-icons">edit</span>
      </button>
    `;
    
    // Pulsante conferma solo se stato "Da confermare"
    if (pren.stato === 'Da confermare') {
      azioni += `
        <button class="btn-icon" onclick="apriModalConferma('${pren.idPrenotazione}')" title="Conferma e genera PDF" style="color: #22c55e;">
          <span class="material-icons">check_circle</span>
        </button>
      `;
    }
    
    // 🔧 FIX: Mostra date + orari formattati
    const dalCompleto = formattaData(pren.giornoInizio) + ' ore ' + formattaOra(pren.oraInizio);
    const alCompleto = formattaData(pren.giornoFine) + ' ore ' + formattaOra(pren.oraFine);
    
    tr.innerHTML = `
      <td>${pren.nome}</td>
      <td>${getNomePulmino(pren.targa)}</td>
      <td>${dalCompleto}</td>
      <td>${alCompleto}</td>
      <td>${pren.cellulare}</td>
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
  return targa;
}

// ========== FILTRI ==========
function applicaFiltroDashboard(tipo) {
  filtroAttivoStat = tipo;
  
  // Evidenzia card attiva
  document.querySelectorAll('.stat-card').forEach(card => {
    card.classList.remove('active');
  });
  document.getElementById('filter-' + tipo).classList.add('active');
  
  let prenotazioniFiltrate = [];
  
  if (tipo === 'totali') {
    prenotazioniFiltrate = prenotazioni;
  } else if (tipo === 'daconfermare') {
    prenotazioniFiltrate = prenotazioni.filter(p => p.stato === 'Da confermare');
  } else if (tipo === 'completate') {
    prenotazioniFiltrate = prenotazioni.filter(p => p.stato === 'Completato');
  } else if (tipo === 'corso') {
    prenotazioniFiltrate = prenotazioni.filter(p => p.stato === 'In corso');
  } else if (tipo === 'future') {
    prenotazioniFiltrate = prenotazioni.filter(p => p.stato === 'Confermata');
  }
  
  renderTabella(prenotazioniFiltrate);
}

function applicaFiltri() {
  const dataInizio = document.getElementById('filter-data-inizio').value;
  const dataFine = document.getElementById('filter-data-fine').value;
  const pulmino = document.getElementById('filter-pulmino').value;
  const stato = document.getElementById('filter-stato').value;
  
  let filtrate = [...prenotazioni];
  
  if (dataInizio) {
    filtrate = filtrate.filter(p => {
      // Converti dd/mm/yyyy a yyyy-mm-dd per confronto
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
    
    // ✅ FIX: Ordinamento speciale per date
    if (campo === 'giornoInizio' || campo === 'giornoFine') {
      // Converti dd/mm/yyyy a Date per confronto corretto
      const dataA = convertiDataPerOrdinamento(valA);
      const dataB = convertiDataPerOrdinamento(valB);
      
      if (ordinamentoAttuale.direzione === 'asc') {
        return dataA - dataB;
      } else {
        return dataB - dataA;
      }
    }
    
    // Ordinamento standard per altri campi
    if (ordinamentoAttuale.direzione === 'asc') {
      return valA > valB ? 1 : -1;
    } else {
      return valA < valB ? 1 : -1;
    }
  });
  
  renderTabella(prenotazioni);
}

// ✅ Funzione helper per convertire date dd/mm/yyyy a timestamp
function convertiDataPerOrdinamento(dataStr) {
  if (!dataStr || dataStr === 'N/A') return 0;
  
  // Formato: dd/mm/yyyy
  const match = dataStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    const [, giorno, mese, anno] = match;
    // Crea Date: anno, mese (0-based), giorno
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
  
  // 🔧 FIX: Mostra date + orari nel modal
  const dettagli = document.getElementById('conferma-dettagli');
  dettagli.innerHTML = `
    <p><strong>ID:</strong> ${prenotazioneDaConfermare.idPrenotazione}</p>
    <p><strong>Cliente:</strong> ${prenotazioneDaConfermare.nome}</p>
    <p><strong>CF:</strong> ${prenotazioneDaConfermare.cf}</p>
    <p><strong>Veicolo:</strong> ${getNomePulmino(prenotazioneDaConfermare.targa)} (${prenotazioneDaConfermare.targa})</p>
    <p><strong>Dal:</strong> ${formattaData(prenotazioneDaConfermare.giornoInizio)} ore ${formattaOra(prenotazioneDaConfermare.oraInizio)}</p>
    <p><strong>Al:</strong> ${formattaData(prenotazioneDaConfermare.giornoFine)} ore ${formattaOra(prenotazioneDaConfermare.oraFine)}</p>
    <p><strong>Cellulare:</strong> ${prenotazioneDaConfermare.cellulare}</p>
  `;
  
  document.getElementById('modalConferma').classList.add('active');
}

function chiudiModalConferma() {
  document.getElementById('modalConferma').classList.remove('active');
  document.getElementById('conferma-importo').value = '';
  prenotazioneDaConfermare = null;
}

// ========== CONFERMA PRENOTAZIONE CON AUTO-REFRESH ==========
async function confermaPrenotazioneAdmin() {
  if (!prenotazioneDaConfermare) {
    alert('Nessuna prenotazione selezionata');
    return;
  }
  
  const importo = document.getElementById('conferma-importo').value.trim();
  
  if (!importo) {
    alert('⚠️ Inserisci l\'importo del preventivo');
    return;
  }
  
  if (!confirm(`Confermare prenotazione ${prenotazioneDaConfermare.idPrenotazione}?\n\nVerrà generato il contratto PDF e lo stato cambierà in "Confermata".`)) {
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
      
      // ✅ Chiudi modal
      chiudiModalConferma();
      
      // ✅ Delay 1 secondo per permettere al backend di completare
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // ✅ Ricarica dati con cache busting
      const cacheBuster = new Date().getTime();
      await caricaPrenotazioni(cacheBuster);
      
      console.log('🔄 Dashboard aggiornata automaticamente');
    } else {
      alert('❌ Errore: ' + (result.error || 'Sconosciuto'));
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
  
  document.getElementById('mod-nome').value = prenotazione.nome;
  document.getElementById('mod-cf').value = prenotazione.cf;
  document.getElementById('mod-targa').value = prenotazione.targa;
  
  document.getElementById('modalModifica').classList.add('active');
}

function chiudiModifica() {
  document.getElementById('modalModifica').classList.remove('active');
}

// ========== EXPORT CSV ==========
function esportaCSV() {
  // 🔧 FIX: Usa punto e virgola come separatore per Excel italiano
  let csv = 'ID;Cliente;CF;Veicolo;Dal;Al;Cellulare;Stato;Importo\n';
  
  prenotazioni.forEach(p => {
    const dalCompleto = (p.giornoInizio || '') + ' ' + (p.oraInizio || '');
    const alCompleto = (p.giornoFine || '') + ' ' + (p.oraFine || '');
    
    csv += `"${p.idPrenotazione}";"${p.nome}";"${p.cf}";"${p.targa}";"${dalCompleto}";"${alCompleto}";"${p.cellulare}";"${p.stato}";"${p.importo}"\n`;
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

// ========== UNDO (placeholder) ==========
function eseguiUndo() {
  alert('Funzione Undo in sviluppo');
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
  console.log('Auto-refresh:', 'Attivo dopo conferma');
  
  if (prenotazioni.length > 0) {
    const stats = {
      totali: prenotazioni.length,
      daConfermare: prenotazioni.filter(p => p.stato === 'Da confermare').length,
      confermate: prenotazioni.filter(p => p.stato === 'Confermata').length,
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
  // ✅ Controlla se già loggato
  if (sessionStorage.getItem('adminLoggedIn') === 'true') {
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('dashboardContent').style.display = 'block';
    caricaPrenotazioni();
  }
  
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      tentaLoginAdmin();
    });
  }
  
  console.log('✅ Admin Dashboard v' + ADMIN_VERSION + ' caricata con auto-refresh');
});
