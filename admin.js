/* Imbriani Noleggio – admin.js v1.0
   Dashboard Admin - Sistema Conferma Prenotazioni
*/

'use strict';

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
  alert(message); // Temporaneo, poi puoi usare toast system
}

// ========== LOGIN ==========
function tentaLoginAdmin() {
  const passwordInput = document.getElementById('passwordInput');
  const loginError = document.getElementById('loginError');
  
  if (!passwordInput || !loginError) return;
  
  const passwordInserita = passwordInput.value.trim();
  
  if (passwordInserita === ADMIN_CONFIG.password) {
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('dashboardContent').style.display = 'block';
    loginError.style.display = 'none';
    
    // Carica prenotazioni
    caricaPrenotazioni();
  } else {
    loginError.style.display = 'block';
  }
}

function logout() {
  if (confirm('Vuoi uscire dalla dashboard?')) {
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('dashboardContent').style.display = 'none';
    document.getElementById('passwordInput').value = '';
    prenotazioni = [];
  }
}

// ========== CARICA PRENOTAZIONI ==========
async function caricaPrenotazioni() {
  showLoader(true);
  
  try {
    const url = ADMIN_CONFIG.endpoints.adminPrenotazioni + '?action=list';
    
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow'
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
  document.getElementById('stat-completate').textContent = stats.completate || 0;
  document.getElementById('stat-corso').textContent = stats.inCorso || 0;
  
  // Calcola future (prenotate + da confermare)
  const future = (stats.totali || 0) - (stats.completate || 0) - (stats.inCorso || 0);
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
    
    tr.innerHTML = `
      <td>${pren.nome}</td>
      <td>${getNomePulmino(pren.targa)}</td>
      <td>${pren.giornoInizio} ${pren.oraInizio}</td>
      <td>${pren.giornoFine} ${pren.oraFine}</td>
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
  } else if (tipo === 'completate') {
    prenotazioniFiltrate = prenotazioni.filter(p => p.stato === 'Completato');
  } else if (tipo === 'corso') {
    prenotazioniFiltrate = prenotazioni.filter(p => p.stato === 'In corso');
  } else if (tipo === 'future') {
    prenotazioniFiltrate = prenotazioni.filter(p => 
      p.stato !== 'Completato' && p.stato !== 'In corso'
    );
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
    filtrate = filtrate.filter(p => p.giornoInizio >= dataInizio);
  }
  
  if (dataFine) {
    filtrate = filtrate.filter(p => p.giornoFine <= dataFine);
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
    
    if (ordinamentoAttuale.direzione === 'asc') {
      return valA > valB ? 1 : -1;
    } else {
      return valA < valB ? 1 : -1;
    }
  });
  
  renderTabella(prenotazioni);
}

// ========== MODAL CONFERMA ==========
function apriModalConferma(idPrenotazione) {
  prenotazioneDaConfermare = prenotazioni.find(p => p.idPrenotazione === idPrenotazione);
  
  if (!prenotazioneDaConfermare) {
    alert('Prenotazione non trovata');
    return;
  }
  
  // Popola dettagli
  const dettagli = document.getElementById('conferma-dettagli');
  dettagli.innerHTML = `
    <p><strong>ID:</strong> ${prenotazioneDaConfermare.idPrenotazione}</p>
    <p><strong>Cliente:</strong> ${prenotazioneDaConfermare.nome}</p>
    <p><strong>CF:</strong> ${prenotazioneDaConfermare.cf}</p>
    <p><strong>Veicolo:</strong> ${getNomePulmino(prenotazioneDaConfermare.targa)} (${prenotazioneDaConfermare.targa})</p>
    <p><strong>Dal:</strong> ${prenotazioneDaConfermare.giornoInizio} ore ${prenotazioneDaConfermare.oraInizio}</p>
    <p><strong>Al:</strong> ${prenotazioneDaConfermare.giornoFine} ore ${prenotazioneDaConfermare.oraFine}</p>
    <p><strong>Cellulare:</strong> ${prenotazioneDaConfermare.cellulare}</p>
  `;
  
  // Apri modal
  document.getElementById('modalConferma').classList.add('active');
}

function chiudiModalConferma() {
  document.getElementById('modalConferma').classList.remove('active');
  document.getElementById('conferma-importo').value = '';
  prenotazioneDaConfermare = null;
}

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
      chiudiModalConferma();
      // Ricarica prenotazioni
      caricaPrenotazioni();
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
  
  // Popola form (implementazione base, puoi espandere)
  document.getElementById('mod-nome').value = prenotazione.nome;
  document.getElementById('mod-cf').value = prenotazione.cf;
  document.getElementById('mod-targa').value = prenotazione.targa;
  
  // Apri modal
  document.getElementById('modalModifica').classList.add('active');
}

function chiudiModifica() {
  document.getElementById('modalModifica').classList.remove('active');
}

// ========== EXPORT CSV ==========
function esportaCSV() {
  let csv = 'ID,Cliente,CF,Veicolo,Dal,Al,Cellulare,Stato,Importo\n';
  
  prenotazioni.forEach(p => {
    csv += `"${p.idPrenotazione}","${p.nome}","${p.cf}","${p.targa}","${p.giornoInizio} ${p.oraInizio}","${p.giornoFine} ${p.oraFine}","${p.cellulare}","${p.stato}","${p.importo}"\n`;
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

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      tentaLoginAdmin();
    });
  }
  
  console.log('✅ Admin Dashboard v1.0 caricata');
});
