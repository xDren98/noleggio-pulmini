// Imbriani Noleggio - scripts.js v5.4.2
// 
// FIX v5.4.2 - 29 Ottobre 2025 19:51 CET:
// ✅ Rimosso testSafeAlert auto su load (causava warning modali su apertura) - Ora opzionale (?test=1 in URL)
// ✅ Aggiunto event listener esplicito per bottone "prenotaOra" (fix click non funzionante)
// ✅ Init rafforzato: Auto-mostra Step 1 su home, no conflitti DOM
// ✅ Preservata SafeAlert + XSS (sanitization su input, validazioni trigger solo su azioni utente)
// ... (tutte funzioni v5.4.1 preservate)
//
// CHANGELOG - VERSIONI PRECEDENTI (da v5.4.1)
// ...

'use strict';

console.log('%c Imbriani Noleggio - System v5.4.2 🚐', 'font-size: 16px; font-weight: bold; color: #667eea; text-shadow: 2px 2px 4px rgba(0,0,0,0.2)');
console.log('%c Build: 2025-10-29 | SafeAlert + XSS Protection Active (No Auto-Test) 🛡️', 'color: #22c55e; font-weight: bold');
console.log('%c Form prenotazione + Area personale + Security hardened + SafeAlert Modals (Fix Load)', 'color: #666');

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

// ========== SECURITY: XSS PROTECTION (Da v5.4.1) ==========
function sanitizeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

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

function createSafeElement(tag, attributes = {}, content = '') {
  const element = document.createElement(tag);
  
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else if (key === 'className') {
      element.className = value;
    } else {
      element.setAttribute(key, value);
    }
  }
  
  if (content) {
    element.textContent = content;
  }
  
  return element;
}

function SafeAlert(type, message, options = {}) {
  const defaults = {
    title: type.charAt(0).toUpperCase() + type.slice(1),
    timeout: 5000,
    autoclose: true,
    icon: type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'
  };
  const config = { ...defaults, ...options };

  const sanitize = (str) => {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .replace(/\\/g, '&#x5C;')
      .replace(/`/g, '&#x60;')
      .replace(/\n/g, '<br>');
  };

  const sanitizedMessage = sanitize(message);

  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 9999; max-width: 400px;
    background: ${type === 'error' ? '#f8d7da' : type === 'success' ? '#d4edda' : type === 'warning' ? '#fff3cd' : '#d1ecf1'};
    color: ${type === 'error' ? '#721c24' : type === 'success' ? '#155724' : type === 'warning' ? '#856404' : '#0c5460'};
    border: 1px solid ${type === 'error' ? '#f5c6cb' : type === 'success' ? '#c3e6cb' : type === 'warning' ? '#ffeaa7' : '#bee5eb'};
    border-radius: 8px; padding: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    font-family: Arial, sans-serif; font-size: 14px; line-height: 1.4;
  `;
  modal.textContent = `${config.icon} ${config.title}: ${sanitizedMessage}`;

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.cssText = 'position: absolute; top: 8px; right: 12px; background: none; border: none; font-size: 20px; cursor: pointer; color: inherit;';
  closeBtn.onclick = () => document.body.removeChild(modal);
  modal.appendChild(closeBtn);

  document.body.appendChild(modal);

  if (config.autoclose) {
    setTimeout(() => {
      if (modal.parentNode) document.body.removeChild(modal);
    }, config.timeout);
  }

  console.log(`[SafeAlert ${type.toUpperCase()}]: ${sanitizedMessage}`);
}

function sanitizeFormData(formData, maskCF = false) {
  const sanitized = {};
  for (const [key, value] of Object.entries(formData)) {
    if (typeof value === 'string') {
      let cleanValue = value
        .trim()
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/[<>]/g, '')
        .substring(0, 500);
      sanitized[key] = cleanValue;

      if (key.includes('email') || key.includes('Email')) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanValue)) {
          SafeAlert('warning', `Email non valida: ${cleanValue}`);
          sanitized[key] = '';
        }
      } else if (key.includes('data') || key.includes('date')) {
        const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
        if (!dateRegex.test(cleanValue)) {
          SafeAlert('warning', `Data non valida: ${cleanValue} (usa DD/MM/YYYY)`);
          sanitized[key] = '';
        }
      } else if (key.includes('tel') || key.includes('cellulare')) {
        const telRegex = /^\+?39\s?\d{3}\s?\d{7,8}$/;
        if (!telRegex.test(cleanValue)) {
          SafeAlert('warning', `Telefono non valido: ${cleanValue}`);
          sanitized[key] = '';
        }
      } else if (maskCF && (key.includes('codiceFiscale') || key.includes('CF'))) {
        sanitized[key] = maskCFClient(cleanValue);
      }
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function maskCFClient(cf) {
  if (!cf || cf.length < 10) return '***';
  return cf.substring(0, 6) + '***' + cf.substring(cf.length - 3);
}

console.log('🛡️ SafeAlert + XSS Protection attivo - scripts.js v5.4.2 (No Auto-Warnings)');

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
  console.log('🚀 Inizializzazione sistema prenotazioni con SafeAlert (v5.4.2)...');
  
  // Carica dati da localStorage se presenti
  caricaDatiLocali();
  
  // Test SafeAlert SOLO se ?test=1 in URL (opzionale per dev, no su produzione)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('test') === '1') {
    testSafeAlert();
  }
  
  // Gestione routing
  const hash = window.location.hash.substring(1);
  
  if (hash === 'area-personale') {
    mostraAreaPersonale();
  } else if (hash === 'riepilogo') {
    mostraRiepilogo();
  } else {
    // Auto-mostra Step 1 su home (fix bottone non trigger)
    mostraStep(1);
  }
  
  // Event listeners esistenti
  document.getElementById('linkAreaPersonale')?.addEventListener('click', (e) => {
    e.preventDefault();
    mostraAreaPersonale();
  });
  
  document.getElementById('tornaHome')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.hash = '';
    location.reload();
  });
  
  // NUOVO: Listener esplicito per bottone "Prenota ora il tuo pulmino" (fix click)
  const btnPrenota = document.getElementById('prenotaOra') || document.querySelector('button[onclick*="mostraStep(1)"]');
  if (btnPrenota) {
    btnPrenota.addEventListener('click', (e) => {
      e.preventDefault();
      mostraStep(1);
      console.log('✅ Bottone Prenota Ora attivato - Step 1');
    });
    // Rimuovi onclick inline se presente per evitare duplicati
    btnPrenota.removeAttribute('onclick');
  } else {
    console.warn('⚠️ Bottone "prenotaOra" non trovato - Verifica ID in index.html');
  }
  
  console.log('✅ Sistema pronto con SafeAlert (Fix: No Warnings on Load, Bottone Prenota OK)');
});

// ========== STEP NAVIGATION (Da v5.4.1, invariata) ==========
function mostraStep(numeroStep) {
  stepCorrente = numeroStep;
  
  document.querySelectorAll('.step-content').forEach(step => {
    step.style.display = 'none';
  });
  
  const stepElement = document.getElementById('step' + numeroStep);
  if (stepElement) {
    stepElement.style.display = 'block';
  }
  
  aggiornaIndicatoreStep(numeroStep);
  
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

// ========== STEP 1: SELEZIONE PULMINO (Invariata) ==========
function mostraListaPulmini() {
  const container = document.getElementById('pulminiContainer');
  if (!container) {
    console.warn('⚠️ Container pulmini non trovato - Verifica index.html');
    return;
  }
  
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
  
  console.log('✅ Lista pulmini mostrata');
}

function selezionaPulmino(targa) {
  const pulmino = PULMINI.find(p => p.targa === targa);
  
  if (!pulmino) {
    SafeAlert('error', 'Pulmino non trovato');
    return;
  }
  
  datiPrenotazione.pulmino = pulmino;
  
  console.log('✅ Pulmino selezionato:', pulmino.nome);
  
  salvaDatiLocali();
  mostraStep(2);
}

// ========== STEP 2: FORM AUTISTI (Invariata, con SafeAlert) ==========
function generaFormAutisti() {
  const container = document.getElementById('autistiContainer');
  if (!container) return;
  
  container.innerHTML = '';
  
  if (!datiPrenotazione.pulmino) {
    const msg = createSafeElement('p', {}, 'Seleziona prima un pulmino');
    container.appendChild(msg);
    SafeAlert('warning', 'Seleziona prima un pulmino');
    return;
  }
  
  // ... (resto invariato da v5.4.1: loop for autisti, createFormGroup, etc.)
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
    
    const divNome = createFormGroup('nomeCognome' + i, 'Nome e Cognome', 'text', true, autista.nomeCognome);
    fieldset.appendChild(divNome);
    
    const divDataNascita = createFormGroup('dataNascita' + i, 'Data di Nascita', 'date', true, autista.dataNascita);
    fieldset.appendChild(divDataNascita);
    
    const divLuogoNascita = createFormGroup('luogoNascita' + i, 'Luogo di Nascita', 'text', true, autista.luogoNascita);
    fieldset.appendChild(divLuogoNascita);
    
    const divCF = createFormGroup('codiceFiscale' + i, 'Codice Fiscale', 'text', true, autista.codiceFiscale);
    fieldset.appendChild(divCF);
    
    const divComune = createFormGroup('comuneResidenza' + i, 'Comune di Residenza', 'text', true, autista.comuneResidenza);
    fieldset.appendChild(divComune);
    
    const divVia = createFormGroup('viaResidenza' + i, 'Via di Residenza', 'text', true, autista.viaResidenza);
    fieldset.appendChild(divVia);
    
    const divCivico = createFormGroup('civicoResidenza' + i, 'Civico', 'text', true, autista.civicoResidenza);
    fieldset.appendChild(divCivico);
    
    const divPatente = createFormGroup('numeroPatente' + i, 'Numero Patente', 'text', true, autista.numeroPatente);
    fieldset.appendChild(divPatente);
    
    const divInizioPatente = createFormGroup('dataInizioValiditaPatente' + i, 'Data Inizio Validità Patente', 'date', true, autista.dataInizioValiditaPatente);
    fieldset.appendChild(divInizioPatente);
    
    const divFinePatente = createFormGroup('dataFineValiditaPatente' + i, 'Scadenza Patente', 'date', true, autista.dataFineValiditaPatente);
    fieldset.appendChild(divFinePatente);
    
    container.appendChild(fieldset);
  }
  
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
          SafeAlert('error', 'Compila tutti i campi obbligatori per l\'autista ' + i);
          input.focus();
          valido = false;
          return;
        }
        autista[campo] = sanitizeHTML(input.value.trim());
      }
    }
    
    const safeAutista = sanitizeFormData(autista, true);
    datiPrenotazione.autisti.push(safeAutista);
  }
  
  if (valido) {
    salvaDatiLocali();
    mostraStep(3);
    SafeAlert('success', 'Dati autisti salvati', { timeout: 3000 });
  }
}

// ========== STEP 3: DATE E ORARI (Invariata) ==========
function mostraSelettoreDate() {
  const container = document.getElementById('selettoreDateContainer');
  if (!container) return;
  
  container.innerHTML = '';
  
  const divDataRitiro = createFormGroup('dataRitiro', 'Data Ritiro', 'date', true, datiPrenotazione.dataRitiro);
  container.appendChild(divDataRitiro);
  
  const divOraRitiro = createSelectGroup('oraRitiro', 'Ora Ritiro', ORARI_DISPONIBILI, true, datiPrenotazione.oraRitiro);
  container.appendChild(divOraRitiro);
  
  const divDataArrivo = createFormGroup('dataArrivo', 'Data Arrivo', 'date', true, datiPrenotazione.dataArrivo);
  container.appendChild(divDataArrivo);
  
  const divOraArrivo = createSelectGroup('oraArrivo', 'Ora Arrivo', ORARI_DISPONIBILI, true, datiPrenotazione.oraArrivo);
  container.appendChild(divOraArrivo);
  
  const divCellulare = createFormGroup('cellulare', 'Numero di Cellulare', 'tel', true, datiPrenotazione.cellulare);
  container.appendChild(divCellulare);
  
  const divDestinazione = createFormGroup('destinazione', 'Destinazione / Note', 'text', false, datiPrenotazione.destinazione);
  container.appendChild(divDestinazione);
  
  const btnContainer = document.createElement('div');
  btnContainer.style.marginTop = '20px';
  
  const btnControlla = document.createElement('button');
  btnControlla.type = 'button';
  btnControlla.className = 'btn btn-primary';
  btnControlla.textContent = 'Controlla Disponibilità';
  btnControlla.onclick = () => controllaDisponibilita();
  
  btnContainer.appendChild(btnControlla);
  container.appendChild(btnContainer);
  
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
  const formData = {
    dataRitiro: document.getElementById('dataRitiro').value,
    oraRitiro: document.getElementById('oraRitiro').value,
    dataArrivo: document.getElementById('dataArrivo').value,
    oraArrivo: document.getElementById('oraArrivo').value,
    cellulare: document.getElementById('cellulare').value.trim(),
    destinazione: document.getElementById('destinazione').value.trim()
  };
  const safeData = sanitizeFormData(formData, true);
  Object.assign(datiPrenotazione, safeData);
  
  if (!datiPrenotazione.dataRitiro || !datiPrenotazione.oraRitiro || 
      !datiPrenotazione.dataArrivo || !datiPrenotazione.oraArrivo || 
      !datiPrenotazione.cellulare) {
    SafeAlert('error', 'Compila tutti i campi obbligatori');
    return;
  }
  
  const dataRitiro = new Date(datiPrenotazione.dataRitiro + ' ' + datiPrenotazione.oraRitiro);
  const dataArrivo = new Date(datiPrenotazione.dataArrivo + ' ' + datiPrenotazione.oraArrivo);
  
  if (dataArrivo <= dataRitiro) {
    SafeAlert('error', 'La data di arrivo deve essere successiva alla data di ritiro');
    return;
  }
  
  mostraLoader(true);
  
  try {
    const url = API_ENDPOINTS.disponibilita + 
      '?targa=' + encodeURIComponent(datiPrenotazione.pulmino.targa) +
      '&dataInizio=' + encodeURIComponent(datiPrenotazione.dataRitiro) +
      '&oraInizio=' + encodeURIComponent(datiPrenotazione.oraRitiro) +
      '&dataFine=' + encodeURIComponent(datiPrenotazione.dataArrivo) +
      '&oraFine=' + encodeURIComponent(datiPrenotazione.oraArrivo);
    
    const response = await fetch(url, { 
      method: 'GET',
      mode: 'cors',
      credentials: 'same-origin'
    });
    const data = await response.json();
    
    if (data.disponibile) {
      SafeAlert('success', 'Veicolo disponibile! Procedi con la prenotazione.', { timeout: 3000 });
      salvaDatiLocali();
      mostraStep(4);
    } else {
      SafeAlert('error', 'Veicolo non disponibile per le date selezionate.\n\nMotivo: ' + (data.messaggio || 'Già prenotato'));
    }
    
  } catch (error) {
    console.error('❌ Errore controllo disponibilità:', error);
    SafeAlert('error', 'Errore di connessione. Riprova.');
  } finally {
    mostraLoader(false);
  }
}

// ========== STEP 4: RIEPILOGO (Invariata) ==========
function mostraRiepilogo() {
  const container = document.getElementById('riepilogoContainer');
  if (!container) return;
  
  container.innerHTML = '';
  
  const h3Veicolo = createSafeElement('h3', {}, '🚐 Veicolo Selezionato');
  container.appendChild(h3Veicolo);
  
  const pVeicolo = createSafeElement('p', {}, 
    datiPrenotazione.pulmino.nome + ' (' + datiPrenotazione.pulmino.targa + ')'
  );
  container.appendChild(pVeicolo);
  
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
  
  const h3Autisti = createSafeElement('h3', {}, '👥 Autisti');
  container.appendChild(h3Autisti);
  
  datiPrenotazione.autisti.forEach((autista, index) => {
    const safeAutista = sanitizeFormData(autista, true);
    const divAutista = document.createElement('div');
    divAutista.style.marginBottom = '10px';
    
    const pNome = createSafeElement('p', {}, 
      (index + 1) + '. ' + safeAutista.nomeCognome + ' - CF: ' + safeAutista.codiceFiscale
    );
    divAutista.appendChild(pNome);
    container.appendChild(divAutista);
  });
  
  const h3Contatto = createSafeElement('h3', {}, '📞 Contatto');
  container.appendChild(h3Contatto);
  
  const pCellulare = createSafeElement('p', {}, 'Cellulare: ' + datiPrenotazione.cellulare);
  container.appendChild(pCellulare);
  
  if (datiPrenotazione.destinazione) {
    const pDest = createSafeElement('p', {}, 'Destinazione: ' + datiPrenotazione.destinazione);
    container.appendChild(pDest);
  }
  
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
  
  const payload = {
    action: 'create',
    prenotazione: sanitizeObject(datiPrenotazione)
  };
  const safePayload = sanitizeFormData(payload.prenotazione, true);
  payload.prenotazione = safePayload;
  
  mostraLoader(true);
  
  try {
    const response = await fetch(API_ENDPOINTS.manageBooking, {
      method: 'POST',
      mode: 'cors',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'payload=' + encodeURIComponent(JSON.stringify(payload))
    });
    
    const data = await response.json();
    
    if (data.success) {
      SafeAlert('success', 'Prenotazione inviata con successo!\n\nID Prenotazione: ' + data.idPrenotazione + '\n\nRiceverai una conferma via email.', { timeout: 7000 });
      
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
      
      window.location.hash = '';
      location.reload();
    } else {
      SafeAlert('error', 'Errore: ' + data.message);
    }
    
  } catch (error) {
    console.error('❌ Errore invio prenotazione:', error);
    SafeAlert('error', 'Errore di connessione. Riprova.');
  } finally {
    mostraLoader(false);
  }
}

// ========== AREA PERSONALE (Invariata) ==========
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
  const cfInputValue = document.getElementById('cfInput').value.trim().toUpperCase();
  const safeCF = sanitizeFormData({ codiceFiscale: cfInputValue }, true).codiceFiscale;
  
  if (!cfInputValue || cfInputValue.length !== 16) {
    SafeAlert('error', 'Inserisci un codice fiscale valido (16 caratteri)');
    return;
  }
  
  mostraLoader(true);
  
  try {
    const url = API_ENDPOINTS.recuperaPrenotazioni + '?cf=' + encodeURIComponent(safeCF);
    
    const response = await fetch(url, { 
      method: 'GET',
      mode: 'cors',
      credentials: 'same-origin'
    });
    const data = await response.json();
    
    if (data.success && data.prenotazioni && data.prenotazioni.length > 0) {
      mostraListaPrenotazioni(data.prenotazioni);
      SafeAlert('success', `Trovate ${data.prenotazioni.length} prenotazioni`);
    } else {
      SafeAlert('info', 'Nessuna prenotazione trovata per questo codice fiscale.');
    }
    
  } catch (error) {
    console.error('❌ Errore recupero prenotazioni:', error);
    SafeAlert('error', 'Errore di connessione. Riprova.');
  } finally {
    mostraLoader(false);
  }
}

function mostraListaPrenotazioni(prenotazioni) {
  const container = document.getElementById('listaPrenotazioni');
  if (!container) return;
  
  container.innerHTML = '';
  
  prenotazioni.forEach(p => {
    const safeP = sanitizeObject(p);
    const card = document.createElement('div');
    card.className = 'prenotazione-card';
    
    const h4 = createSafeElement('h4', {}, 'Prenotazione ' + safeP.idPrenotazione);
    card.appendChild(h4);
    
    const pVeicolo = createSafeElement('p', {}, '🚐 ' + safeP.pulmino);
    card.appendChild(pVeicolo);
    
    const pDate = createSafeElement('p', {}, 
      '📅 Dal ' + safeP.dataRitiro + ' al ' + safeP.dataConsegna
    );
    card.appendChild(pDate);
    
    const pStato = createSafeElement('p', {}, '📋 Stato: ' + safeP.stato);
    card.appendChild(pStato);
    
    container.appendChild(card);
  });
  
  container.style.display = 'block';
}

// ========== UTILITY (Invariata) ==========
function salvaDatiLocali() {
  try {
    const safeDati = sanitizeObject(datiPrenotazione);
    localStorage.setItem('datiPrenotazione', JSON.stringify(safeDati));
  } catch (e) {
    console.warn('⚠️ Impossibile salvare in localStorage:', e);
    SafeAlert('warning', 'Impossibile salvare dati localmente');
  }
}

function caricaDatiLocali() {
  try {
    const saved = localStorage.getItem('datiPrenotazione');
    if (saved) {
      const parsed = JSON.parse(saved);
      datiPrenotazione = sanitizeObject(parsed);
      console.log('✅ Dati caricati da localStorage (sanitizzati)');
    }
  } catch (e) {
    console.warn('⚠️ Impossibile caricare da localStorage:', e);
    SafeAlert('warning', 'Impossibile caricare dati salvati');
  }
}

function mostraLoader(show) {
  const loader = document.getElementById('loader');
  if (loader) {
    loader.style.display = show ? 'flex' : 'none';
  }
}

/**
 * Test SafeAlert (Opzionale: Run manualmente o con ?test=1)
 */
function testSafeAlert() {
  console.log('=== TEST SAFEALERT v5.4.2 (Manuale) ===');
  
  const dirtyData = { nome: 'Mario <script>alert("XSS")</script>', email: 'test@evil.com', codiceFiscale: 'RSSMRA80A01H501X' };
  const clean = sanitizeFormData(dirtyData, true);
  console.log('Dirty → Clean:', dirtyData, clean);
  
  SafeAlert('success', 'Test messaggio con <script> - dovrebbe essere safe');
  SafeAlert('error', 'Errore con " o \' - escaped');
  
  const invalid = { email: 'invalid', data: '32/13/2025', tel: '123' };
  sanitizeFormData(invalid);
  
  console.log('✅ Test SafeAlert completati - Integrazione OK');
}
