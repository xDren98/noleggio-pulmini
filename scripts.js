// Imbriani Noleggio - scripts.js v5.4.0
// 
// FIX v5.4.0 - 29 Ottobre 2025 12:50 CET:
// ✅ XSS Protection: sanitizzazione completa innerHTML (17 fix)
// ✅ Funzioni sanitizeHTML, sanitizeObject, createSafeElement
// ✅ Input utente sempre sanitizzato prima del rendering
// ✅ Eliminati tutti gli innerHTML vulnerabili
//
// CHANGELOG - VERSIONI PRECEDENTI
// v5.3.8 - 28 Ottobre 2025:
// - Step 2.5 preventivo con campo destinazione
// - Messaggio WhatsApp con date in formato italiano dd/mm/yyyy
// - Campo destinazione passato al backend e salvato su sheet
// - Autocompletamento cellulare per utenti loggati
// - FIX: Autocompletamento date nascita, patente con convertiDataPerInput
// - Sistema conferma prenotazioni: stato "Da confermare"
// - Email automatica agli admin per nuove prenotazioni
// - PDF generato solo dopo conferma admin
// - Logica disponibilità con buffer orari 4 ore v2.2
//
// v5.3.6 - 27 Ottobre 2025:
// - GET request per evitare CORS preflight (datiCliente, disponibilita, prenotazioni)
// - POST form-encoded per manageBooking (no preflight)
// - fetchJSON senza Content-Type header
// - Form modifica con SELECT per orari
// - Validazione età massima 90 anni
// - Emoji riepilogo gestite via CSS (non hardcoded nel JS)
//
// v5.3.5 - 26 Ottobre 2025:
// - Area personale con lista prenotazioni
// - Modifica e cancellazione prenotazioni
// - Validazione 7 giorni prima della partenza
// - Sistema routing multi-step (prenotazione / area-personale / riepilogo)
// - Persistenza form su localStorage
// - Recupero prenotazioni per codice fiscale
// - Auto-popolamento campi per utenti registrati

'use strict';

console.log('%c Imbriani Noleggio - System v5.4.0 🚐', 'font-size: 16px; font-weight: bold; color: #667eea; text-shadow: 2px 2px 4px rgba(0,0,0,0.2)');
console.log('%c Build: 2025-10-29 | XSS Protection Active 🛡️', 'color: #22c55e; font-weight: bold');
console.log('%c Form prenotazione + Area personale + Security hardened', 'color: #666');

// ========== CONFIGURAZIONE ==========
const PULMINI = [
  { targa: 'FP509YJ', nome: 'Pulmino 9 Posti', posti: 9 },
  { targa: 'FX444EE', nome: 'Pulmino 9 Posti', posti: 9 },
  { targa: 'DW556TF', nome: 'Furgone 8 Posti', posti: 8 },
  { targa: 'FE045JJ', nome: 'Pulmino 9 Posti', posti: 9 }
];

const API_ENDPOINTS = {
  manageBooking: 'https://script.google.com/macros/s/AKfycbxAKX12Sgc0ODvGtUEXCRoINheSeO9-SgDNGuY1QtrVKBENdY0SpMiDtzgoxIBRCuQ/exec',
  disponibilita: 'https://script.google.com/macros/s/AKfycbwW_v8TJrKnyAF8xIp4_sQiJj87yMI-8Bc_u-_HXEocE4VXCwb4lP0_8z_2eqQUqNRp/exec',
  datiCliente: 'https://script.google.com/macros/s/AKfycbwZyY8FTqvlYLylAEZqEbI6JdDJJ9_VFEBBdIuPbF-hpHZNcOXj2sHRzv1sEwg-3zzZ/exec',
  recuperaPrenotazioni: 'https://script.google.com/macros/s/AKfycbw3kxLfWxI8V5BF4i2vZ9G5FjJVPKTXmvVWqQjk24OypH5Y_y-EqVYl7wAIa1AEdMXf/exec'
};

const ORARI_DISPONIBILI = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'
];

// ========== SECURITY: XSS PROTECTION ==========
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
 * Sanitizza oggetto ricorsivamente
 * @param {Object} obj - Oggetto da sanitizzare
 * @return {Object} Oggetto con stringhe sanitizzate
 */
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        sanitized[key] = sanitizeHTML(value);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
  }
  
  return sanitized;
}

/**
 * Crea elemento HTML sicuro
 * @param {string} tag - Tag HTML
 * @param {Object} attributes - Attributi elemento
 * @param {string} content - Contenuto testuale (sanitizzato)
 * @return {HTMLElement} Elemento DOM sicuro
 */
function createSafeElement(tag, attributes = {}, content = '') {
  const element = document.createElement(tag);
  
  // Imposta attributi
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else if (key === 'className') {
      element.className = value;
    } else {
      element.setAttribute(key, value);
    }
  }
  
  // Imposta contenuto (sempre textContent, mai innerHTML)
  if (content) {
    element.textContent = content;
  }
  
  return element;
}

console.log('🛡️ XSS Protection attivo - scripts.js v5.4.0');

// ========== STATE ==========
let stepCorrente = 1;
let datiPrenotazione = {
  pulmino: null,
  autisti: [],
  dataRitiro: '',
  oraRitiro: '',
  dataArrivo: '',
  oraArrivo: '',
  cellulare: '',
  destinazione: ''
};

let utenteLoggato = null;

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Inizializzazione sistema prenotazioni...');
  
  // Carica dati da localStorage se presenti
  caricaDatiLocali();
  
  // Gestione routing
  const hash = window.location.hash.substring(1);
  
  if (hash === 'area-personale') {
    mostraAreaPersonale();
  } else if (hash === 'riepilogo') {
    mostraRiepilogo();
  } else {
    mostraStep(1);
  }
  
  // Event listeners
  document.getElementById('linkAreaPersonale')?.addEventListener('click', (e) => {
    e.preventDefault();
    mostraAreaPersonale();
  });
  
  document.getElementById('tornaHome')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.hash = '';
    location.reload();
  });
  
  console.log('✅ Sistema pronto');
});

// ========== STEP NAVIGATION ==========
function mostraStep(numeroStep) {
  stepCorrente = numeroStep;
  
  // Nascondi tutti gli step
  document.querySelectorAll('.step-content').forEach(step => {
    step.style.display = 'none';
  });
  
  // Mostra step corrente
  const stepElement = document.getElementById('step' + numeroStep);
  if (stepElement) {
    stepElement.style.display = 'block';
  }
  
  // Aggiorna indicatore step
  aggiornaIndicatoreStep(numeroStep);
  
  // Esegui azioni specifiche per step
  switch(numeroStep) {
    case 1:
      mostraListaPulmini();
      break;
    case 2:
      generaFormAutisti();
      break;
    case 3:
      mostraSelettoreDate();
      break;
    case 4:
      mostraRiepilogo();
      break;
  }
  
  console.log('📍 Step ' + numeroStep + ' attivo');
}

function aggiornaIndicatoreStep(stepAttivo) {
  document.querySelectorAll('.step-indicator').forEach((indicator, index) => {
    indicator.classList.remove('active', 'completed');
    
    if (index + 1 < stepAttivo) {
      indicator.classList.add('completed');
    } else if (index + 1 === stepAttivo) {
      indicator.classList.add('active');
    }
  });
}

// ========== STEP 1: SELEZIONE PULMINO ==========
function mostraListaPulmini() {
  const container = document.getElementById('pulminiContainer');
  if (!container) return;
  
  container.innerHTML = '';
  
  PULMINI.forEach(pulmino => {
    const card = createSafeElement('div', {
      className: 'pulmino-card',
      onclick: `selezionaPulmino('${pulmino.targa}')`
    });
    
    const h3 = createSafeElement('h3', {}, pulmino.nome);
    const targaP = createSafeElement('p', { className: 'targa' }, '🚐 ' + pulmino.targa);
    const postiP = createSafeElement('p', { className: 'posti' }, '👥 ' + pulmino.posti + ' posti');
    
    card.appendChild(h3);
    card.appendChild(targaP);
    card.appendChild(postiP);
    
    container.appendChild(card);
  });
}

function selezionaPulmino(targa) {
  const pulmino = PULMINI.find(p => p.targa === targa);
  
  if (!pulmino) {
    console.error('❌ Pulmino non trovato:', targa);
    return;
  }
  
  datiPrenotazione.pulmino = pulmino;
  
  console.log('✅ Pulmino selezionato:', pulmino.nome);
  
  salvaDatiLocali();
  mostraStep(2);
}

// ========== STEP 2: FORM AUTISTI ==========
function generaFormAutisti() {
  const container = document.getElementById('autistiContainer');
  if (!container) return;
  
  container.innerHTML = '';
  
  if (!datiPrenotazione.pulmino) {
    const msg = createSafeElement('p', {}, 'Seleziona prima un pulmino');
    container.appendChild(msg);
    return;
  }
  
  const numAutisti = Math.min(3, datiPrenotazione.pulmino.posti);
  
  for (let i = 1; i <= numAutisti; i++) {
    const autista = datiPrenotazione.autisti[i - 1] || {};
    
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'autista-section';
    fieldset.id = 'autista' + i;
    
    const legend = createSafeElement('legend', {}, 
      i === 1 ? '👤 Autista Principale' : '👤 Autista ' + i
    );
    fieldset.appendChild(legend);
    
    // Nome e Cognome
    const divNome = createFormGroup('nomeCognome' + i, 'Nome e Cognome', 'text', true, autista.nomeCognome);
    fieldset.appendChild(divNome);
    
    // Data di nascita
    const divDataNascita = createFormGroup('dataNascita' + i, 'Data di Nascita', 'date', true, autista.dataNascita);
    fieldset.appendChild(divDataNascita);
    
    // Luogo di nascita
    const divLuogoNascita = createFormGroup('luogoNascita' + i, 'Luogo di Nascita', 'text', true, autista.luogoNascita);
    fieldset.appendChild(divLuogoNascita);
    
    // Codice fiscale
    const divCF = createFormGroup('codiceFiscale' + i, 'Codice Fiscale', 'text', true, autista.codiceFiscale);
    fieldset.appendChild(divCF);
    
    // Comune residenza
    const divComune = createFormGroup('comuneResidenza' + i, 'Comune di Residenza', 'text', true, autista.comuneResidenza);
    fieldset.appendChild(divComune);
    
    // Via residenza
    const divVia = createFormGroup('viaResidenza' + i, 'Via di Residenza', 'text', true, autista.viaResidenza);
    fieldset.appendChild(divVia);
    
    // Civico
    const divCivico = createFormGroup('civicoResidenza' + i, 'Civico', 'text', true, autista.civicoResidenza);
    fieldset.appendChild(divCivico);
    
    // Numero patente
    const divPatente = createFormGroup('numeroPatente' + i, 'Numero Patente', 'text', true, autista.numeroPatente);
    fieldset.appendChild(divPatente);
    
    // Data inizio patente
    const divInizioPatente = createFormGroup('dataInizioValiditaPatente' + i, 'Data Inizio Validità Patente', 'date', true, autista.dataInizioValiditaPatente);
    fieldset.appendChild(divInizioPatente);
    
    // Data fine patente
    const divFinePatente = createFormGroup('dataFineValiditaPatente' + i, 'Scadenza Patente', 'date', true, autista.dataFineValiditaPatente);
    fieldset.appendChild(divFinePatente);
    
    container.appendChild(fieldset);
  }
  
  // Bottone avanti
  const btnContainer = document.createElement('div');
  btnContainer.style.marginTop = '20px';
  
  const btnAvanti = document.createElement('button');
  btnAvanti.type = 'button';
  btnAvanti.className = 'btn btn-primary';
  btnAvanti.textContent = 'Avanti →';
  btnAvanti.onclick = () => salvaAutistiEAvanti();
  
  btnContainer.appendChild(btnAvanti);
  container.appendChild(btnContainer);
}

function createFormGroup(id, label, type, required, value = '') {
  const div = document.createElement('div');
  div.className = 'form-group';
  
  const labelEl = document.createElement('label');
  labelEl.setAttribute('for', id);
  labelEl.textContent = label + (required ? ' *' : '');
  
  const input = document.createElement('input');
  input.type = type;
  input.id = id;
  input.name = id;
  input.required = required;
  
  if (value) {
    input.value = sanitizeHTML(String(value));
  }
  
  div.appendChild(labelEl);
  div.appendChild(input);
  
  return div;
}

function salvaAutistiEAvanti() {
  const numAutisti = Math.min(3, datiPrenotazione.pulmino.posti);
  datiPrenotazione.autisti = [];
  
  let valido = true;
  
  for (let i = 1; i <= numAutisti; i++) {
    const autista = {};
    
    const campi = [
      'nomeCognome', 'dataNascita', 'luogoNascita', 'codiceFiscale',
      'comuneResidenza', 'viaResidenza', 'civicoResidenza',
      'numeroPatente', 'dataInizioValiditaPatente', 'dataFineValiditaPatente'
    ];
    
    for (const campo of campi) {
      const input = document.getElementById(campo + i);
      if (input) {
        if (input.required && !input.value.trim()) {
          alert('Compila tutti i campi obbligatori per l\'autista ' + i);
          input.focus();
          valido = false;
          return;
        }
        autista[campo] = sanitizeHTML(input.value.trim());
      }
    }
    
    datiPrenotazione.autisti.push(autista);
  }
  
  if (valido) {
    salvaDatiLocali();
    mostraStep(3);
  }
}

// ========== STEP 3: DATE E ORARI ==========
function mostraSelettoreDate() {
  const container = document.getElementById('selettoreDateContainer');
  if (!container) return;
  
  container.innerHTML = '';
  
  // Data ritiro
  const divDataRitiro = createFormGroup('dataRitiro', 'Data Ritiro', 'date', true, datiPrenotazione.dataRitiro);
  container.appendChild(divDataRitiro);
  
  // Ora ritiro
  const divOraRitiro = createSelectGroup('oraRitiro', 'Ora Ritiro', ORARI_DISPONIBILI, true, datiPrenotazione.oraRitiro);
  container.appendChild(divOraRitiro);
  
  // Data arrivo
  const divDataArrivo = createFormGroup('dataArrivo', 'Data Arrivo', 'date', true, datiPrenotazione.dataArrivo);
  container.appendChild(divDataArrivo);
  
  // Ora arrivo
  const divOraArrivo = createSelectGroup('oraArrivo', 'Ora Arrivo', ORARI_DISPONIBILI, true, datiPrenotazione.oraArrivo);
  container.appendChild(divOraArrivo);
  
  // Cellulare
  const divCellulare = createFormGroup('cellulare', 'Numero di Cellulare', 'tel', true, datiPrenotazione.cellulare);
  container.appendChild(divCellulare);
  
  // Destinazione
  const divDestinazione = createFormGroup('destinazione', 'Destinazione / Note', 'text', false, datiPrenotazione.destinazione);
  container.appendChild(divDestinazione);
  
  // Bottone controlla disponibilità
  const btnContainer = document.createElement('div');
  btnContainer.style.marginTop = '20px';
  
  const btnControlla = document.createElement('button');
  btnControlla.type = 'button';
  btnControlla.className = 'btn btn-primary';
  btnControlla.textContent = 'Controlla Disponibilità';
  btnControlla.onclick = () => controllaDisponibilita();
  
  btnContainer.appendChild(btnControlla);
  container.appendChild(btnContainer);
  
  // Imposta date minime
  const oggi = new Date();
  oggi.setDate(oggi.getDate() + 1);
  const dataMin = oggi.toISOString().split('T')[0];
  
  document.getElementById('dataRitiro').min = dataMin;
  document.getElementById('dataArrivo').min = dataMin;
}

function createSelectGroup(id, label, options, required, value = '') {
  const div = document.createElement('div');
  div.className = 'form-group';
  
  const labelEl = document.createElement('label');
  labelEl.setAttribute('for', id);
  labelEl.textContent = label + (required ? ' *' : '');
  
  const select = document.createElement('select');
  select.id = id;
  select.name = id;
  select.required = required;
  
  const optionDefault = document.createElement('option');
  optionDefault.value = '';
  optionDefault.textContent = '-- Seleziona --';
  select.appendChild(optionDefault);
  
  options.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt;
    option.textContent = opt;
    if (opt === value) {
      option.selected = true;
    }
    select.appendChild(option);
  });
  
  div.appendChild(labelEl);
  div.appendChild(select);
  
  return div;
}

async function controllaDisponibilita() {
  // Raccogli dati
  datiPrenotazione.dataRitiro = document.getElementById('dataRitiro').value;
  datiPrenotazione.oraRitiro = document.getElementById('oraRitiro').value;
  datiPrenotazione.dataArrivo = document.getElementById('dataArrivo').value;
  datiPrenotazione.oraArrivo = document.getElementById('oraArrivo').value;
  datiPrenotazione.cellulare = sanitizeHTML(document.getElementById('cellulare').value.trim());
  datiPrenotazione.destinazione = sanitizeHTML(document.getElementById('destinazione').value.trim());
  
  // Validazioni
  if (!datiPrenotazione.dataRitiro || !datiPrenotazione.oraRitiro || 
      !datiPrenotazione.dataArrivo || !datiPrenotazione.oraArrivo || 
      !datiPrenotazione.cellulare) {
    alert('Compila tutti i campi obbligatori');
    return;
  }
  
  const dataRitiro = new Date(datiPrenotazione.dataRitiro + ' ' + datiPrenotazione.oraRitiro);
  const dataArrivo = new Date(datiPrenotazione.dataArrivo + ' ' + datiPrenotazione.oraArrivo);
  
  if (dataArrivo <= dataRitiro) {
    alert('La data di arrivo deve essere successiva alla data di ritiro');
    return;
  }
  
  // Mostra loader
  mostraLoader(true);
  
  try {
    const url = API_ENDPOINTS.disponibilita + 
      '?targa=' + encodeURIComponent(datiPrenotazione.pulmino.targa) +
      '&dataInizio=' + encodeURIComponent(datiPrenotazione.dataRitiro) +
      '&oraInizio=' + encodeURIComponent(datiPrenotazione.oraRitiro) +
      '&dataFine=' + encodeURIComponent(datiPrenotazione.dataArrivo) +
      '&oraFine=' + encodeURIComponent(datiPrenotazione.oraArrivo);
    
    const response = await fetch(url, { method: 'GET' });
    const data = await response.json();
    
    if (data.disponibile) {
      alert('✅ Veicolo disponibile! Procedi con la prenotazione.');
      salvaDatiLocali();
      mostraStep(4);
    } else {
      alert('❌ Veicolo non disponibile per le date selezionate.\n\nMotivo: ' + (data.messaggio || 'Già prenotato'));
    }
    
  } catch (error) {
    console.error('❌ Errore controllo disponibilità:', error);
    alert('Errore di connessione. Riprova.');
  } finally {
    mostraLoader(false);
  }
}

// ========== STEP 4: RIEPILOGO ==========
function mostraRiepilogo() {
  const container = document.getElementById('riepilogoContainer');
  if (!container) return;
  
  container.innerHTML = '';
  
  // Sezione veicolo
  const h3Veicolo = createSafeElement('h3', {}, '🚐 Veicolo Selezionato');
  container.appendChild(h3Veicolo);
  
  const pVeicolo = createSafeElement('p', {}, 
    datiPrenotazione.pulmino.nome + ' (' + datiPrenotazione.pulmino.targa + ')'
  );
  container.appendChild(pVeicolo);
  
  // Sezione date
  const h3Date = createSafeElement('h3', {}, '📅 Date e Orari');
  container.appendChild(h3Date);
  
  const pRitiro = createSafeElement('p', {}, 
    'Ritiro: ' + datiPrenotazione.dataRitiro + ' alle ' + datiPrenotazione.oraRitiro
  );
  container.appendChild(pRitiro);
  
  const pArrivo = createSafeElement('p', {}, 
    'Consegna: ' + datiPrenotazione.dataArrivo + ' alle ' + datiPrenotazione.oraArrivo
  );
  container.appendChild(pArrivo);
  
  // Sezione autisti
  const h3Autisti = createSafeElement('h3', {}, '👥 Autisti');
  container.appendChild(h3Autisti);
  
  datiPrenotazione.autisti.forEach((autista, index) => {
    const divAutista = document.createElement('div');
    divAutista.style.marginBottom = '10px';
    
    const pNome = createSafeElement('p', {}, 
      (index + 1) + '. ' + autista.nomeCognome + ' - CF: ' + autista.codiceFiscale
    );
    divAutista.appendChild(pNome);
    container.appendChild(divAutista);
  });
  
  // Sezione contatto
  const h3Contatto = createSafeElement('h3', {}, '📞 Contatto');
  container.appendChild(h3Contatto);
  
  const pCellulare = createSafeElement('p', {}, 'Cellulare: ' + datiPrenotazione.cellulare);
  container.appendChild(pCellulare);
  
  if (datiPrenotazione.destinazione) {
    const pDest = createSafeElement('p', {}, 'Destinazione: ' + datiPrenotazione.destinazione);
    container.appendChild(pDest);
  }
  
  // Bottone conferma
  const btnContainer = document.createElement('div');
  btnContainer.style.marginTop = '30px';
  
  const btnConferma = document.createElement('button');
  btnConferma.type = 'button';
  btnConferma.className = 'btn btn-success btn-lg';
  btnConferma.textContent = '✓ Conferma Prenotazione';
  btnConferma.onclick = () => inviaPrenotazione();
  
  btnContainer.appendChild(btnConferma);
  container.appendChild(btnContainer);
}

async function inviaPrenotazione() {
  if (!confirm('Confermi l\'invio della prenotazione?')) {
    return;
  }
  
  mostraLoader(true);
  
  try {
    const payload = {
      action: 'create',
      prenotazione: sanitizeObject(datiPrenotazione)
    };
    
    const response = await fetch(API_ENDPOINTS.manageBooking, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'payload=' + encodeURIComponent(JSON.stringify(payload))
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('✅ Prenotazione inviata con successo!\n\nID Prenotazione: ' + data.idPrenotazione + '\n\nRiceverai una conferma via email.');
      
      // Reset dati
      datiPrenotazione = {
        pulmino: null,
        autisti: [],
        dataRitiro: '',
        oraRitiro: '',
        dataArrivo: '',
        oraArrivo: '',
        cellulare: '',
        destinazione: ''
      };
      
      localStorage.removeItem('datiPrenotazione');
      
      // Torna all'inizio
      window.location.hash = '';
      location.reload();
    } else {
      alert('❌ Errore: ' + data.message);
    }
    
  } catch (error) {
    console.error('❌ Errore invio prenotazione:', error);
    alert('Errore di connessione. Riprova.');
  } finally {
    mostraLoader(false);
  }
}

// ========== AREA PERSONALE ==========
async function mostraAreaPersonale() {
  window.location.hash = 'area-personale';
  
  document.querySelectorAll('.step-content').forEach(s => s.style.display = 'none');
  document.getElementById('areaPersonaleContainer').style.display = 'block';
  
  const cfInput = document.getElementById('cfInput');
  if (!cfInput) return;
  
  cfInput.value = '';
  cfInput.focus();
}

async function cercaPrenotazioni() {
  const cf = document.getElementById('cfInput').value.trim().toUpperCase();
  
  if (!cf || cf.length !== 16) {
    alert('Inserisci un codice fiscale valido (16 caratteri)');
    return;
  }
  
  mostraLoader(true);
  
  try {
    const url = API_ENDPOINTS.recuperaPrenotazioni + '?cf=' + encodeURIComponent(cf);
    
    const response = await fetch(url, { method: 'GET' });
    const data = await response.json();
    
    if (data.success && data.prenotazioni && data.prenotazioni.length > 0) {
      mostraListaPrenotazioni(data.prenotazioni);
    } else {
      alert('Nessuna prenotazione trovata per questo codice fiscale.');
    }
    
  } catch (error) {
    console.error('❌ Errore recupero prenotazioni:', error);
    alert('Errore di connessione. Riprova.');
  } finally {
    mostraLoader(false);
  }
}

function mostraListaPrenotazioni(prenotazioni) {
  const container = document.getElementById('listaPrenotazioni');
  if (!container) return;
  
  container.innerHTML = '';
  
  prenotazioni.forEach(p => {
    const card = document.createElement('div');
    card.className = 'prenotazione-card';
    
    const h4 = createSafeElement('h4', {}, 'Prenotazione ' + p.idPrenotazione);
    card.appendChild(h4);
    
    const pVeicolo = createSafeElement('p', {}, '🚐 ' + p.pulmino);
    card.appendChild(pVeicolo);
    
    const pDate = createSafeElement('p', {}, 
      '📅 Dal ' + p.dataRitiro + ' al ' + p.dataConsegna
    );
    card.appendChild(pDate);
    
    const pStato = createSafeElement('p', {}, '📋 Stato: ' + p.stato);
    card.appendChild(pStato);
    
    container.appendChild(card);
  });
  
  container.style.display = 'block';
}

// ========== UTILITY ==========
function salvaDatiLocali() {
  try {
    localStorage.setItem('datiPrenotazione', JSON.stringify(datiPrenotazione));
  } catch (e) {
    console.warn('⚠️ Impossibile salvare in localStorage:', e);
  }
}

function caricaDatiLocali() {
  try {
    const saved = localStorage.getItem('datiPrenotazione');
    if (saved) {
      datiPrenotazione = JSON.parse(saved);
      console.log('✅ Dati caricati da localStorage');
    }
  } catch (e) {
    console.warn('⚠️ Impossibile caricare da localStorage:', e);
  }
}

function mostraLoader(show) {
  const loader = document.getElementById('loader');
  if (loader) {
    loader.style.display = show ? 'flex' : 'none';
  }
}
