/* Imbriani Noleggio – scripts.js v5.3.5 CORRETTO
   
   FIX v5.3.5:
   - ✅ Rimosso proxy CORS (chiamate dirette)
   - ✅ Form modifica con SELECT orari (non time input)
   - ✅ Validazione età max 90 anni
   - ✅ mostraModuliAutisti safe merge (no race condition)
   - ✅ Emoji riepilogo solo testo (CSS le aggiunge)
   - ✅ Versione allineata a 5.3.5
   
   DATA: 28 Ottobre 2025
*/
'use strict';
console.log('Imbriani Noleggio - v5.3.5 CORRETTO');


// ========== ENDPOINTS (SENZA PROXY) ==========
const SCRIPTS = {
  datiCliente: 'https://script.google.com/macros/s/AKfycbxnC-JSK4YXvV8GF6ED9uK3SSNYs3uAFAmyji6KB_eQ60QAqXIHbTM-18F7-Zu47bo/exec',
  disponibilita: 'https://script.google.com/macros/s/AKfycbwhEK3IH-hLGYpGXHRjcYdUaW2e3He485XpgcRVr0GBSyE4v4-gSCp5vnSCbn5ocNI/exec',
  prenotazioni: 'https://script.google.com/macros/s/AKfycbyMPuvESaAJ7bIraipTya9yUKnyV8eYbm-r8CX42KRvDQsX0f44QBsaqQOY8KVYFBE/exec',
  manageBooking: 'https://script.google.com/macros/s/AKfycbz_1yZ6nKRN3mlVDHSQmN9Idzgvqp9UBzK01AxVzm4Y33ot6vVlsDKC3eNZLPCPZU0/exec'
};


// ========== CATALOGO VEICOLI ==========
const pulmini = [
  {
    id: 'ducato_lungo',
    nome: 'Fiat Ducato (Passo lungo)',
    targa: 'EC787NM',
    posti: 9,
    marca: 'Fiat',
    modello: 'Ducato'
  },
  {
    id: 'ducato_corto',
    nome: 'Fiat Ducato (Passo corto)',
    targa: 'DN391FW',
    posti: 9,
    marca: 'Fiat',
    modello: 'Ducato'
  },
  {
    id: 'peugeot',
    nome: 'Peugeot Expert Tepee',
    targa: 'DL291XZ',
    posti: 9,
    marca: 'Peugeot',
    modello: 'Expert Tepee'
  }
];


// ========== STATO GLOBALE ==========
const bookingData = {
  dataRitiro: '',
  dataArrivo: '',
  oraRitiro: '08:00',
  oraArrivo: '20:00',
  pulmino: null,
  targa: '',
  autisti: [{}],
  cellulare: ''
};

let loggedCustomerData = null;
let prenotazioniMap = new Map();
let autistiCache = [];


// ========== UTILITY FUNCTIONS ==========
const qs = (selector) => document.querySelector(selector);
const qsa = (selector) => document.querySelectorAll(selector);

function el(tag, attrs = {}, ...children) {
  const elem = document.createElement(tag);
  
  for (const key in attrs) {
    if (key === 'class') {
      elem.className = attrs[key];
    } else if (key === 'text') {
      elem.textContent = attrs[key];
    } else if (key === 'html') {
      elem.innerHTML = attrs[key];
    } else if (key === 'dataset') {
      for (const dataKey in attrs.dataset) {
        elem.dataset[dataKey] = attrs.dataset[dataKey];
      }
    } else if (key.startsWith('on') && typeof attrs[key] === 'function') {
      elem.addEventListener(key.substring(2).toLowerCase(), attrs[key]);
    } else {
      elem.setAttribute(key, attrs[key]);
    }
  }
  
  children.flat(Infinity).forEach(child => {
    if (child instanceof Node) {
      elem.appendChild(child);
    } else if (child != null) {
      elem.appendChild(document.createTextNode(String(child)));
    }
  });
  
  return elem;
}

function clearAndAppend(parent, ...children) {
  if (!parent) return;
  parent.innerHTML = '';
  children.flat(Infinity).forEach(child => {
    if (child instanceof Node) {
      parent.appendChild(child);
    } else if (child != null) {
      parent.appendChild(document.createTextNode(String(child)));
    }
  });
}

function asString(val, fallback = '') {
  return (val !== null && val !== undefined) ? String(val) : fallback;
}


// ========== FETCH CON TIMEOUT (SENZA PROXY) ==========
async function withTimeout(promise, ms = 30000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout: richiesta troppo lenta')), ms)
    )
  ]);
}

async function fetchJSON(url, options = {}) {
  const response = await withTimeout(fetch(url, options), options.timeout || 30000);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const text = await response.text();
  
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('Errore parsing JSON:', text);
    return {};
  }
}


// ========== API CALLS (DIRETTE, SENZA PROXY) ==========
async function apiPostDatiCliente(cf) {
  return fetchJSON(SCRIPTS.datiCliente, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cf })
  });
}

async function apiPostDisponibilita(params) {
  return fetchJSON(SCRIPTS.disponibilita, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
}

async function apiPostPrenotazioni(cf) {
  return fetchJSON(SCRIPTS.prenotazioni, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cf })
  });
}

async function apiManageBooking(payload) {
  return fetchJSON(SCRIPTS.manageBooking, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}


// ========== LOADING & MESSAGES ==========
function mostraLoading(visible) {
  const overlay = qs('#loading-overlay');
  if (overlay) {
    overlay.style.display = visible ? 'flex' : 'none';
    overlay.setAttribute('aria-busy', visible ? 'true' : 'false');
  }
}

function mostraErrore(msg) {
  console.error('❌', msg);
  showBanner(msg, 'error');
}

function mostraSuccesso(msg) {
  console.log('✅', msg);
  showBanner(msg, 'success');
}

function showBanner(msg, type) {
  const banner = el('div', { 
    class: type === 'error' ? 'error-banner' : 'success-banner' 
  },
    el('span', { class: 'banner-ico', text: type === 'error' ? '❌' : '✅' }),
    el('span', { class: 'banner-msg', text: msg })
  );
  
  document.body.appendChild(banner);
  
  setTimeout(() => {
    banner.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => banner.remove(), 300);
  }, 4000);
}


// ========== VALIDAZIONE ==========
function validateCF(cf) {
  const cleaned = cf.toUpperCase().trim();
  if (cleaned.length !== 16) return false;
  if (!/^[A-Z0-9]+$/.test(cleaned)) return false;
  return true;
}

function validatePhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 9 && cleaned.length <= 15;
}

function validatePatente(numero) {
  const cleaned = numero.toUpperCase().trim();
  return cleaned.length >= 8 && /^[A-Z0-9]+$/.test(cleaned);
}

function validateNomeCognome(nome) {
  return nome.trim().length >= 5;
}

function calcolaEta(dataNascita) {
  const oggi = new Date();
  const nascita = new Date(dataNascita);
  let eta = oggi.getFullYear() - nascita.getFullYear();
  const m = oggi.getMonth() - nascita.getMonth();
  if (m < 0 || (m === 0 && oggi.getDate() < nascita.getDate())) {
    eta--;
  }
  return eta;
}


// ========== CONVERSIONE DATE ==========
function dateToISO(dateStr) {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split('/');
    return `${y}-${m}-${d}`;
  }
  return dateStr;
}

function dateToItalian(dateStr) {
  if (!dateStr) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }
  return dateStr;
}


// ========== ROUTING ==========
function routeTo(view, step = null) {
  qsa('[data-section]').forEach(s => s.classList.add('hidden'));
  
  if (view === 'homepage') {
    qs('#homepage')?.classList.remove('hidden');
  } else if (view === 'area') {
    qs('#area-personale')?.classList.remove('hidden');
  } else if (view === 'wizard') {
    qs('#mainbox')?.classList.remove('hidden');
    qsa('.step').forEach(s => s.classList.add('hidden'));
    if (step) qs(`#${step}`)?.classList.remove('hidden');
  } else if (view === 'modifica') {
    qs('#modifica-prenotazione')?.classList.remove('hidden');
  }
}


// ========== LOGIN ==========
async function handleLogin() {
  const cfInput = qs('#cf-login');
  const cf = cfInput?.value.toUpperCase().trim() || '';
  
  if (!validateCF(cf)) {
    return mostraErrore('Codice fiscale non valido (16 caratteri)');
  }
  
  mostraLoading(true);
  
  try {
    const [datiRes, prenotazioniRes] = await Promise.all([
      apiPostDatiCliente(cf),
      apiPostPrenotazioni(cf)
    ]);
    
    if (!datiRes.success) {
      throw new Error(datiRes.error || 'Nessun dato trovato');
    }
    
    loggedCustomerData = datiRes.cliente || {};
    loggedCustomerData.codiceFiscale = cf;
    
    prenotazioniMap.clear();
    if (Array.isArray(prenotazioniRes.prenotazioni)) {
      prenotazioniRes.prenotazioni.forEach(p => {
        if (p['ID prenotazione']) {
          prenotazioniMap.set(p['ID prenotazione'], p);
        }
      });
    }
    
    console.log(`✅ Login: ${loggedCustomerData.nome}, ${prenotazioniMap.size} prenotazioni`);
    console.log(`⚡ Performance: dati ${datiRes.executionTime || 'N/A'}ms, prenotazioni ${prenotazioniRes.executionTime || 'N/A'}ms`);
    
    renderAreaPersonale();
    routeTo('area');
    history.pushState({ view: 'area' }, '', '#area');
    
  } catch (err) {
    console.error('Errore login:', err);
    mostraErrore(err.message || 'Errore durante il login');
  } finally {
    mostraLoading(false);
  }
}


// ========== AREA PERSONALE ==========
function renderAreaPersonale() {
  const root = qs('#area-personale-content');
  if (!root) return;
  
  const welcomeCard = el('div', { class: 'welcome-card' },
    el('h2', { text: `Benvenuto, ${loggedCustomerData.nome || 'Utente'}!` }),
    el('p', { text: `CF: ${loggedCustomerData.codiceFiscale}` }),
    el('p', { text: `Tel: ${loggedCustomerData.cellulare || 'Non disponibile'}` })
  );
  
  const prenotazioni = Array.from(prenotazioniMap.values());
  
  const prenotazioniCard = el('div', { class: 'prenotazioni-card' },
    el('h3', { text: `Le tue prenotazioni (${prenotazioni.length})` }),
    prenotazioni.length === 0 
      ? el('p', { text: 'Nessuna prenotazione trovata.' })
      : el('div', { class: 'prenotazioni-lista' },
          ...prenotazioni.map(p => renderPrenotazioneItem(p))
        )
  );
  
  const btnNuova = el('button', { 
    class: 'btn btn--primary',
    onclick: () => {
      sessionStorage.removeItem('imbriani_booking_draft');
      bookingData.autisti = [{ 
        nomeCognome: loggedCustomerData.nome || '',
        codiceFiscale: loggedCustomerData.codiceFiscale || '',
        numeroPatente: loggedCustomerData.numeroPatente || '',
        dataNascita: loggedCustomerData.dataNascita || '',
        luogoNascita: loggedCustomerData.luogoNascita || '',
        comuneResidenza: loggedCustomerData.comuneResidenza || '',
        viaResidenza: loggedCustomerData.viaResidenza || '',
        civicoResidenza: loggedCustomerData.civicoResidenza || '',
        dataInizioValiditaPatente: loggedCustomerData.dataInizioValiditaPatente || '',
        dataFineValiditaPatente: loggedCustomerData.dataFineValiditaPatente || ''
      }];
      bookingData.cellulare = loggedCustomerData.cellulare || '';
      setupStep1();
      routeTo('wizard', 'step1');
      history.pushState({ view: 'wizard', step: 'step1' }, '', '#step1');
    }
  },
    el('span', { class: 'material-icons', text: 'add_circle' }),
    'Nuova prenotazione'
  );
  
  const btnLogout = el('button', { 
    class: 'btn btn--secondary',
    onclick: () => {
      loggedCustomerData = null;
      prenotazioniMap.clear();
      sessionStorage.clear();
      routeTo('homepage');
      history.pushState({ view: 'homepage' }, '', '#home');
    }
  },
    el('span', { class: 'material-icons', text: 'logout' }),
    'Esci'
  );
  
  clearAndAppend(root, welcomeCard, prenotazioniCard, btnNuova, btnLogout);
}

function renderPrenotazioneItem(p) {
  const idPrenotazione = p['ID prenotazione'] || '';
  const stato = p.stato || '';
  
  return el('div', { class: 'prenotazione-item' },
    el('strong', { text: idPrenotazione }),
    el('p', { text: `Veicolo: ${p.Targa || p.targa || '-'}` }),
    el('p', { text: `Dal ${p['Giorno inizio noleggio']} ore ${p['Ora inizio noleggio']}` }),
    el('p', { text: `Al ${p['Giorno fine noleggio']} ore ${p['Ora fine noleggio']}` }),
    el('p', { text: `Stato: ${stato}` }),
    el('button', { 
      class: 'btn btn--sm',
      onclick: () => modificaPrenotazione(idPrenotazione)
    }, 'Modifica')
  );
}
// ========== MODIFICA PRENOTAZIONE (CON SELECT ORARI) ==========
function modificaPrenotazione(idPrenotazione) {
  const p = prenotazioniMap.get(idPrenotazione);
  if (!p) {
    return mostraErrore('Prenotazione non trovata');
  }
  
  const dataInizio = dateToISO(p['Giorno inizio noleggio']);
  const diff = Math.floor((new Date(dataInizio) - new Date()) / (1000 * 60 * 60 * 24));
  const isModificabile = diff >= 7;
  
  const formContent = qs('#modifica-form-content');
  if (!formContent) return;
  
  const avvisoNonModificabile = !isModificabile 
    ? el('div', { 
        class: 'error-banner',
        style: 'position: relative; margin-bottom: 20px;'
      },
        el('span', { class: 'banner-ico', text: '⚠️' }),
        el('span', { class: 'banner-msg', text: 'Modifiche non consentite (meno di 7 giorni)' })
      )
    : null;
  
  const campiModificabili = [
    { label: 'Nome e Cognome', name: 'Nome', value: p['Nome'], type: 'text' },
    { label: 'Data di nascita', name: 'Data di nascita', value: dateToISO(p['Data di nascita']), type: 'date' },
    { label: 'Luogo di nascita', name: 'Luogo di nascita', value: p['Luogo di nascita'], type: 'text' },
    { label: 'Codice fiscale', name: 'Codice fiscale', value: p['Codice fiscale'], type: 'text' },
    { label: 'Comune residenza', name: 'Comune di residenza', value: p['Comune di residenza'], type: 'text' },
    { label: 'Via residenza', name: 'Via di residenza', value: p['Via di residenza'], type: 'text' },
    { label: 'Civico', name: 'Civico di residenza', value: p['Civico di residenza'], type: 'text' },
    { label: 'Numero patente', name: 'Numero di patente', value: p['Numero di patente'], type: 'text' },
    { label: 'Inizio validità patente', name: 'Data inizio validità patente', value: dateToISO(p['Data inizio validità patente']), type: 'date' },
    { label: 'Scadenza patente', name: 'Scadenza patente', value: dateToISO(p['Scadenza patente']), type: 'date' },
    { label: 'Cellulare', name: 'Cellulare', value: p['Cellulare'], type: 'tel' }
  ];
  
  // ⚡ SELECT per orari (non input time)
  const oraInizioValue = asString(p['Ora inizio noleggio'], '08:00');
  const oraFineValue = asString(p['Ora fine noleggio'], '20:00');
  
  const selectOraInizio = el('select', { 
    name: 'Ora inizio noleggio',
    required: true,
    disabled: !isModificabile,
    style: 'width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px; font-size: 16px;'
  },
    el('option', { value: '08:00', selected: oraInizioValue === '08:00' }, '08:00'),
    el('option', { value: '12:00', selected: oraInizioValue === '12:00' }, '12:00'),
    el('option', { value: '16:00', selected: oraInizioValue === '16:00' }, '16:00'),
    el('option', { value: '20:00', selected: oraInizioValue === '20:00' }, '20:00')
  );
  
  const selectOraFine = el('select', { 
    name: 'Ora fine noleggio',
    required: true,
    disabled: !isModificabile,
    style: 'width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px; font-size: 16px;'
  },
    el('option', { value: '08:00', selected: oraFineValue === '08:00' }, '08:00'),
    el('option', { value: '12:00', selected: oraFineValue === '12:00' }, '12:00'),
    el('option', { value: '16:00', selected: oraFineValue === '16:00' }, '16:00'),
    el('option', { value: '20:00', selected: oraFineValue === '20:00' }, '20:00')
  );
  
  const form = el('form', { id: 'form-modifica' },
    avvisoNonModificabile,
    el('h4', { text: 'ID: ' + idPrenotazione }),
    el('label', { text: 'Giorno inizio noleggio' }),
    el('input', { 
      name: 'Giorno inizio noleggio',
      type: 'date',
      value: dateToISO(p['Giorno inizio noleggio']), 
      required: true,
      disabled: !isModificabile
    }),
    el('label', { text: 'Ora inizio noleggio' }),
    selectOraInizio,
    el('label', { text: 'Giorno fine noleggio' }),
    el('input', { 
      name: 'Giorno fine noleggio',
      type: 'date',
      value: dateToISO(p['Giorno fine noleggio']), 
      required: true,
      disabled: !isModificabile
    }),
    el('label', { text: 'Ora fine noleggio' }),
    selectOraFine,
    ...campiModificabili.map(campo => [
      el('label', { text: campo.label }),
      el('input', { 
        name: campo.name,
        type: campo.type,
        value: campo.value, 
        required: true,
        disabled: !isModificabile
      })
    ]).flat()
  );
  
  const btnSalva = el('button', { 
    type: 'submit',
    class: 'btn btn--primary',
    disabled: !isModificabile
  }, 'Salva modifiche');
  
  const btnElimina = el('button', { 
    type: 'button',
    class: 'btn btn--danger',
    onclick: () => confermaEliminazionePrenotazione(idPrenotazione)
  }, 'Elimina prenotazione');
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (isModificabile) {
      salvaModificaPrenotazione(idPrenotazione, new FormData(form));
    }
  });
  
  clearAndAppend(formContent, form, el('div', { class: 'actions' }, btnSalva, btnElimina));
  
  routeTo('modifica');
  history.pushState({ view: 'modifica', id: idPrenotazione }, '', `#modifica-${idPrenotazione}`);
}

async function salvaModificaPrenotazione(idPrenotazione, formData) {
  const payload = { action: 'update', idPrenotazione };
  
  for (const [key, value] of formData.entries()) {
    payload[key] = value;
  }
  
  mostraLoading(true);
  
  try {
    const res = await apiManageBooking(payload);
    
    if (!res.success) {
      throw new Error(res.error || 'Errore salvataggio');
    }
    
    console.log(`✅ Prenotazione ${idPrenotazione} aggiornata`);
    mostraSuccesso('Prenotazione aggiornata con successo');
    
    const cfNorm = loggedCustomerData.codiceFiscale.toUpperCase().trim();
    const prenotazioniRes = await apiPostPrenotazioni(cfNorm);
    
    prenotazioniMap.clear();
    if (Array.isArray(prenotazioniRes.prenotazioni)) {
      prenotazioniRes.prenotazioni.forEach(p => {
        if (p['ID prenotazione']) {
          prenotazioniMap.set(p['ID prenotazione'], p);
        }
      });
    }
    
    renderAreaPersonale();
    routeTo('area');
    history.pushState({ view: 'area' }, '', '#area');
    
  } catch (err) {
    console.error('Errore modifica:', err);
    mostraErrore(err.message || 'Errore durante la modifica');
  } finally {
    mostraLoading(false);
  }
}

function confermaEliminazionePrenotazione(idPrenotazione) {
  const modal = el('div', { class: 'modal-overlay', onclick: (e) => {
    if (e.target === modal) modal.remove();
  }},
    el('div', { class: 'modal-content' },
      el('h3', { text: 'Conferma eliminazione' }),
      el('p', { text: `Vuoi davvero eliminare la prenotazione ${idPrenotazione}? Questa azione è irreversibile.` }),
      el('div', { class: 'modal-actions' },
        el('button', { 
          class: 'btn btn--secondary',
          onclick: () => modal.remove()
        }, 'Annulla'),
        el('button', { 
          class: 'btn btn--danger',
          onclick: () => {
            modal.remove();
            handleDeletePrenotazione(idPrenotazione);
          }
        }, 'Elimina')
      )
    )
  );
  
  document.body.appendChild(modal);
}

async function handleDeletePrenotazione(idPrenotazione) {
  mostraLoading(true);
  
  try {
    const res = await apiManageBooking({ 
      action: 'delete', 
      idPrenotazione 
    });
    
    if (!res.success) {
      throw new Error(res.error || 'Errore eliminazione');
    }
    
    console.log(`✅ Prenotazione ${idPrenotazione} eliminata`);
    mostraSuccesso('Prenotazione eliminata con successo');
    
    prenotazioniMap.delete(idPrenotazione);
    
    try {
      const cfNorm = loggedCustomerData.codiceFiscale.toUpperCase().trim();
      const prenotazioniRes = await apiPostPrenotazioni(cfNorm);
      
      prenotazioniMap.clear();
      if (Array.isArray(prenotazioniRes.prenotazioni)) {
        prenotazioniRes.prenotazioni.forEach(p => {
          if (p['ID prenotazione']) {
            prenotazioniMap.set(p['ID prenotazione'], p);
          }
        });
      }
      
      renderAreaPersonale();
    } catch (err) {
      console.error('❌ Errore ricaricamento:', err);
      mostraErrore('Prenotazione eliminata, ma errore ricaricamento lista');
    }
    
    routeTo('area');
    history.pushState({ view: 'area' }, '', '#area');
    
  } catch (err) {
    console.error('❌ Errore DELETE:', err);
    mostraErrore(err.message || 'Impossibile eliminare la prenotazione');
  } finally {
    mostraLoading(false);
  }
}


// ========== STEP 1 — Controlla Disponibilità ==========
async function controllaDisponibilita() {
  const dataR = qs('#data_ritiro')?.value || '';
  const dataA = qs('#data_arrivo')?.value || '';
  const oraR = qs('#ora_partenza')?.value || '';
  const oraA = qs('#ora_arrivo')?.value || '';
  
  if (!dataR || !dataA) return mostraErrore('Compila le date');
  if (new Date(dataR) > new Date(dataA)) {
    return mostraErrore('Data fine precedente a data inizio');
  }
  
  bookingData.dataRitiro = dataR;
  bookingData.dataArrivo = dataA;
  bookingData.oraRitiro = oraR;
  bookingData.oraArrivo = oraA;
  sessionStorage.setItem('imbriani_booking_draft', JSON.stringify(bookingData));
  
  mostraLoading(true);
  try {
    const res = await apiPostDisponibilita({ 
      dataRitiro: dataR, 
      dataArrivo: dataA, 
      oraRitiro: oraR, 
      oraArrivo: oraA 
    });
    
    console.log(`⚡ Disponibilità caricata in ${res.executionTime || 'N/A'}ms (cache: ${res.cached || false})`);
    
    const vehicles = Array.isArray(res.vehicles) && res.vehicles.length 
      ? res.vehicles 
      : pulmini;
    
    renderPulminiCards(vehicles);
    routeTo('wizard', 'step2');
    history.pushState({ view: 'wizard', step: 'step2' }, '', '#step2');
  } catch (err) {
    console.error(err);
    mostraErrore('Errore verifica disponibilità, uso catalogo base');
    renderPulminiCards(pulmini);
    routeTo('wizard', 'step2');
    history.pushState({ view: 'wizard', step: 'step2' }, '', '#step2');
  } finally {
    mostraLoading(false);
  }
}


// ========== STEP 2 — Card veicoli ==========
function renderPulminiCards(vehicles) {
  const root = qs('#lista-pulmini');
  if (!root) return;
  
  clearAndAppend(root, ...vehicles.map(v =>
    el('div', { 
      class: 'card-pulmino', 
      dataset: { id: v.id, targa: v.targa || '' }, 
      onclick: () => selectPulmino(v),
      tabindex: 0,
      role: 'button',
      'aria-label': `Seleziona ${v.nome}`
    },
      el('div', { class: 'card-title', text: v.nome }),
      el('div', { class: 'card-sub', text: `Targa: ${v.targa || '-'}` })
    )
  ));
}

function selectPulmino(v) {
  qsa('.card-pulmino').forEach(c => c.classList.remove('selected'));
  const card = qs(`.card-pulmino[data-id="${v.id}"]`);
  if (card) card.classList.add('selected');
  
  bookingData.pulmino = { id: v.id, nome: v.nome, targa: v.targa || '' };
  bookingData.targa = v.targa || '';
  sessionStorage.setItem('imbriani_booking_draft', JSON.stringify(bookingData));
  
  const btn = qs('#btn-step2-continua');
  if (btn) btn.disabled = false;
}

function continuaStep2() {
  if (!bookingData.pulmino || !bookingData.pulmino.id) {
    return mostraErrore('Seleziona un veicolo');
  }
  
  if (!bookingData.autisti || !bookingData.autisti.length) {
    bookingData.autisti = [{}];
  }
  
  mostraModuliAutisti();
  routeTo('wizard', 'step3');
  history.pushState({ view: 'wizard', step: 'step3' }, '', '#step3');
}


// ========== STEP 3 — Autisti (SAFE MERGE) ==========
function mostraModuliAutisti() {
  const root = qs('#autisti-container');
  if (!root) return;
  
  const numAutisti = bookingData.autisti?.length || 1;
  
  // Salva dati correnti form
  saveAutistiFromForm(3);
  
  // ⚡ SAFE MERGE: Solo se cache ha dati validi
  for (let i = 0; i < numAutisti; i++) {
    if (autistiCache[i] && (autistiCache[i].nomeCognome || autistiCache[i].codiceFiscale)) {
      bookingData.autisti[i] = { 
        ...bookingData.autisti[i], 
        ...autistiCache[i] 
      };
    }
  }
  
  clearAndAppend(root, 
    ...Array.from({ length: numAutisti }, (_, i) => 
      buildAutistaForm(i + 1, bookingData.autisti?.[i] || {})
    )
  );
  
  // Pre-fill cellulare
  const cellInput = qs('#cellulare');
  if (cellInput && bookingData.cellulare) {
    cellInput.value = bookingData.cellulare;
  }
}

function buildAutistaForm(numero, dati = {}) {
  const prefix = `aut${numero}`;
  
  return el('div', { class: 'form-autista' },
    el('h4', { text: `Autista ${numero}` }),
    
    el('label', { for: `${prefix}-nome`, text: 'Nome e Cognome *' }),
    el('input', { 
      type: 'text',
      id: `${prefix}-nome`,
      name: `${prefix}-nome`,
      value: dati.nomeCognome || '',
      required: numero === 1
    }),
    
    el('label', { for: `${prefix}-nascita`, text: 'Data di nascita *' }),
    el('input', { 
      type: 'date',
      id: `${prefix}-nascita`,
      name: `${prefix}-nascita`,
      value: dateToISO(dati.dataNascita) || '',
      required: numero === 1
    }),
    
    el('label', { for: `${prefix}-luogo`, text: 'Luogo di nascita *' }),
    el('input', { 
      type: 'text',
      id: `${prefix}-luogo`,
      name: `${prefix}-luogo`,
      value: dati.luogoNascita || '',
      required: numero === 1
    }),
    
    el('label', { for: `${prefix}-cf`, text: 'Codice fiscale *' }),
    el('input', { 
      type: 'text',
      id: `${prefix}-cf`,
      name: `${prefix}-cf`,
      value: dati.codiceFiscale || '',
      maxlength: 16,
      style: 'text-transform: uppercase;',
      required: numero === 1
    }),
    
    el('label', { for: `${prefix}-comune`, text: 'Comune di residenza *' }),
    el('input', { 
      type: 'text',
      id: `${prefix}-comune`,
      name: `${prefix}-comune`,
      value: dati.comuneResidenza || '',
      required: numero === 1
    }),
    
    el('label', { for: `${prefix}-via`, text: 'Via di residenza *' }),
    el('input', { 
      type: 'text',
      id: `${prefix}-via`,
      name: `${prefix}-via`,
      value: dati.viaResidenza || '',
      required: numero === 1
    }),
    
    el('label', { for: `${prefix}-civico`, text: 'Civico' }),
    el('input', { 
      type: 'text',
      id: `${prefix}-civico`,
      name: `${prefix}-civico`,
      value: dati.civicoResidenza || ''
    }),
    
    el('label', { for: `${prefix}-patente`, text: 'Numero patente *' }),
    el('input', { 
      type: 'text',
      id: `${prefix}-patente`,
      name: `${prefix}-patente`,
      value: dati.numeroPatente || '',
      required: numero === 1
    }),
    
    el('label', { for: `${prefix}-patente-inizio`, text: 'Inizio validità patente *' }),
    el('input', { 
      type: 'date',
      id: `${prefix}-patente-inizio`,
      name: `${prefix}-patente-inizio`,
      value: dateToISO(dati.dataInizioValiditaPatente) || '',
      required: numero === 1
    }),
    
    el('label', { for: `${prefix}-patente-fine`, text: 'Scadenza patente *' }),
    el('input', { 
      type: 'date',
      id: `${prefix}-patente-fine`,
      name: `${prefix}-patente-fine`,
      value: dateToISO(dati.dataFineValiditaPatente) || '',
      required: numero === 1
    })
  );
}

function saveAutistiFromForm(maxCount) {
  autistiCache = [];
  
  for (let i = 1; i <= maxCount; i++) {
    const prefix = `aut${i}`;
    const nome = qs(`#${prefix}-nome`)?.value || '';
    
    if (nome.trim()) {
      autistiCache.push({
        nomeCognome: nome,
        dataNascita: qs(`#${prefix}-nascita`)?.value || '',
        luogoNascita: qs(`#${prefix}-luogo`)?.value || '',
        codiceFiscale: qs(`#${prefix}-cf`)?.value.toUpperCase() || '',
        comuneResidenza: qs(`#${prefix}-comune`)?.value || '',
        viaResidenza: qs(`#${prefix}-via`)?.value || '',
        civicoResidenza: qs(`#${prefix}-civico`)?.value || '',
        numeroPatente: qs(`#${prefix}-patente`)?.value || '',
        dataInizioValiditaPatente: qs(`#${prefix}-patente-inizio`)?.value || '',
        dataFineValiditaPatente: qs(`#${prefix}-patente-fine`)?.value || ''
      });
    }
  }
}

function continuaStep3() {
  saveAutistiFromForm(3);
  
  const cellulare = qs('#cellulare')?.value.trim() || '';
  
  if (!validatePhone(cellulare)) {
    return mostraErrore('Numero cellulare non valido (min 9 cifre)');
  }
  
  bookingData.cellulare = cellulare;
  bookingData.autisti = autistiCache.filter(a => a.nomeCognome);
  
  if (!bookingData.autisti.length) {
    return mostraErrore('Inserisci almeno un autista');
  }
  
  // Validazione autista 1
  const a1 = bookingData.autisti[0];
  
  if (!validateNomeCognome(a1.nomeCognome)) {
    return mostraErrore('Nome autista 1: minimo 5 caratteri');
  }
  if (!validateCF(a1.codiceFiscale)) {
    return mostraErrore('Codice fiscale autista 1 non valido');
  }
  if (!validatePatente(a1.numeroPatente)) {
    return mostraErrore('Numero patente autista 1 non valido');
  }
  
  // ⚡ Validazione età con max 90 anni
  const eta = calcolaEta(a1.dataNascita);
  if (eta < 18 || eta > 90) {
    return mostraErrore("L'autista deve avere tra 18 e 90 anni");
  }
  
  sessionStorage.setItem('imbriani_booking_draft', JSON.stringify(bookingData));
  
  mostraRiepilogo();
  routeTo('wizard', 'step4');
  history.pushState({ view: 'wizard', step: 'step4' }, '', '#step4');
}
// ========== STEP 4 — Riepilogo (EMOJI SOLO TESTO) ==========
function mostraRiepilogo() {
  const root = qs('#riepilogo-content');
  if (!root) return;
  
  const a1 = bookingData.autisti[0] || {};
  
  // ⚡ Emoji SOLO nel testo, CSS le aggiunge via ::before
  const elements = [
    el('div', { class: 'card' },
      el('h3', { text: 'Veicolo' }),
      rItem('Modello', bookingData.pulmino?.nome),
      rItem('Targa', bookingData.pulmino?.targa),
      
      el('h3', { text: 'Periodo' }),
      rItem('Ritiro', `${dateToItalian(bookingData.dataRitiro)} ore ${bookingData.oraRitiro}`),
      rItem('Consegna', `${dateToItalian(bookingData.dataArrivo)} ore ${bookingData.oraArrivo}`),
      
      el('h3', { text: 'Autista Principale' }),
      rItem('Nome', a1.nomeCognome),
      rItem('Nascita', `${dateToItalian(a1.dataNascita)} - ${a1.luogoNascita}`),
      rItem('Codice Fiscale', a1.codiceFiscale),
      rItem('Residenza', `${a1.viaResidenza} ${a1.civicoResidenza}, ${a1.comuneResidenza}`),
      rItem('Patente', a1.numeroPatente),
      rItem('Validità patente', `${dateToItalian(a1.dataInizioValiditaPatente)} → ${dateToItalian(a1.dataFineValiditaPatente)}`),
      
      el('h3', { text: 'Contatto' }),
      rItem('Cellulare', bookingData.cellulare)
    )
  ];
  
  // Autisti aggiuntivi
  if (bookingData.autisti.length > 1) {
    for (let i = 1; i < bookingData.autisti.length; i++) {
      const a = bookingData.autisti[i];
      if (a.nomeCognome || a.codiceFiscale) {
        elements.push(
          el('div', { class: 'card' },
            el('h3', { text: `Autista ${i + 1}` }),
            rItem('Nome', a.nomeCognome),
            rItem('CF', a.codiceFiscale),
            rItem('Patente', a.numeroPatente)
          )
        );
      }
    }
  }
  
  clearAndAppend(root, ...elements);
}

function rItem(label, value) {
  return el('p', {}, el('strong', { text: `${label}: ` }), value || '-');
}


// ========== INVIO PRENOTAZIONE ==========
async function inviaPrenotazione() {
  mostraLoading(true);
  
  try {
    const payload = {
      action: 'create',
      prenotazione: {
        pulmino: bookingData.pulmino,
        targa: bookingData.targa,
        dataRitiro: bookingData.dataRitiro,
        dataArrivo: bookingData.dataArrivo,
        oraRitiro: bookingData.oraRitiro,
        oraArrivo: bookingData.oraArrivo,
        cellulare: bookingData.cellulare,
        autisti: bookingData.autisti
      }
    };
    
    console.log('📤 Invio prenotazione:', payload);
    
    const res = await apiManageBooking(payload);
    
    if (!res.success) {
      throw new Error(res.error || 'Errore invio prenotazione');
    }
    
    console.log(`✅ Prenotazione creata: ${res.idPrenotazione} (${res.executionTime}ms)`);
    
    mostraSuccesso(`Prenotazione ${res.idPrenotazione} confermata!`);
    
    sessionStorage.removeItem('imbriani_booking_draft');
    
    Object.assign(bookingData, {
      dataRitiro: '',
      dataArrivo: '',
      oraRitiro: '08:00',
      oraArrivo: '20:00',
      pulmino: null,
      targa: '',
      autisti: [{}],
      cellulare: ''
    });
    
    if (loggedCustomerData) {
      const cfNorm = loggedCustomerData.codiceFiscale.toUpperCase().trim();
      const prenotazioniRes = await apiPostPrenotazioni(cfNorm);
      
      prenotazioniMap.clear();
      if (Array.isArray(prenotazioniRes.prenotazioni)) {
        prenotazioniRes.prenotazioni.forEach(p => {
          if (p['ID prenotazione']) {
            prenotazioniMap.set(p['ID prenotazione'], p);
          }
        });
      }
      
      renderAreaPersonale();
      routeTo('area');
      history.pushState({ view: 'area' }, '', '#area');
    } else {
      routeTo('homepage');
      history.pushState({ view: 'homepage' }, '', '#home');
    }
    
  } catch (err) {
    console.error('❌ Errore invio:', err);
    mostraErrore(err.message || 'Errore durante l\'invio');
  } finally {
    mostraLoading(false);
  }
}


// ========== SETUP LISTENERS ==========
function setupStep1() {
  const btnControlla = qs('#btn-controlla-disponibilita');
  if (btnControlla) {
    btnControlla.onclick = () => controllaDisponibilita();
  }
}

function setupStep2() {
  const btn = qs('#btn-step2-continua');
  if (btn) {
    btn.onclick = () => continuaStep2();
  }
}

function setupStep3() {
  const selectNum = qs('#numero-autisti');
  if (selectNum) {
    selectNum.onchange = (e) => {
      const num = parseInt(e.target.value, 10);
      bookingData.autisti = Array.from({ length: num }, (_, i) => 
        bookingData.autisti[i] || {}
      );
      mostraModuliAutisti();
    };
  }
  
  const btn = qs('#btn-step3-continua');
  if (btn) {
    btn.onclick = () => continuaStep3();
  }
}

function setupStep4() {
  const btn = qs('#btn-invia-prenotazione');
  if (btn) {
    btn.onclick = () => inviaPrenotazione();
  }
}

function setupBackButtons() {
  qsa('.btn-back').forEach(btn => {
    btn.onclick = () => {
      const target = btn.dataset.target;
      if (target) {
        routeTo('wizard', target);
        history.pushState({ view: 'wizard', step: target }, '', `#${target}`);
      } else if (qs('#modifica-prenotazione:not(.hidden)')) {
        renderAreaPersonale();
        routeTo('area');
        history.pushState({ view: 'area' }, '', '#area');
      } else {
        routeTo('homepage');
        history.pushState({ view: 'homepage' }, '', '#home');
      }
    };
  });
}

function setupHomepage() {
  const form = qs('#form-login');
  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      handleLogin();
    };
  }
  
  const btnNew = qs('#btnNewBooking');
  if (btnNew) {
    btnNew.onclick = () => {
      sessionStorage.removeItem('imbriani_booking_draft');
      bookingData.autisti = [{}];
      setupStep1();
      routeTo('wizard', 'step1');
      history.pushState({ view: 'wizard', step: 'step1' }, '', '#step1');
    };
  }
}

function setupSiteTitle() {
  const title = qs('#site-title');
  if (title) {
    title.onclick = () => {
      loggedCustomerData = null;
      prenotazioniMap.clear();
      sessionStorage.clear();
      routeTo('homepage');
      history.pushState({ view: 'homepage' }, '', '#home');
    };
  }
}


// ========== HISTORY MANAGEMENT ==========
window.addEventListener('popstate', (e) => {
  const state = e.state;
  
  if (!state || !state.view) {
    routeTo('homepage');
    return;
  }
  
  if (state.view === 'homepage') {
    routeTo('homepage');
  } else if (state.view === 'area') {
    if (loggedCustomerData) {
      renderAreaPersonale();
      routeTo('area');
    } else {
      routeTo('homepage');
    }
  } else if (state.view === 'wizard') {
    routeTo('wizard', state.step || 'step1');
  } else if (state.view === 'modifica') {
    if (state.id) {
      modificaPrenotazione(state.id);
    } else {
      routeTo('area');
    }
  }
});


// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Imbriani Noleggio v5.3.5 inizializzato');
  
  setupHomepage();
  setupStep1();
  setupStep2();
  setupStep3();
  setupStep4();
  setupBackButtons();
  setupSiteTitle();
  
  const hash = window.location.hash;
  
  if (hash === '#area' && loggedCustomerData) {
    renderAreaPersonale();
    routeTo('area');
  } else if (hash.startsWith('#step')) {
    routeTo('wizard', hash.substring(1));
  } else {
    routeTo('homepage');
  }
  
  history.replaceState({ view: 'homepage' }, '', '#home');
});


// ========== METADATA ==========
window.ImbrianiApp = {
  version: '5.3.5',
  buildDate: '2025-10-28',
  features: [
    'Login CF',
    'Area personale',
    'CREATE/UPDATE/DELETE prenotazioni',
    'Wizard multi-step',
    'Cache session',
    'Validazione robusta',
    'Responsive design',
    'No proxy CORS',
    'Select orari form modifica',
    'Validazione età 18-90',
    'Safe autisti merge'
  ],
  getBookingData: () => bookingData,
  getLoggedUser: () => loggedCustomerData,
  getPrenotazioni: () => Array.from(prenotazioniMap.values())
};

console.log('✅ ImbrianiApp ready:', window.ImbrianiApp.version);
