/* Imbriani Noleggio – scripts.js FINALE CORRETTO
   Versione 5.3.4 COMPLETA
   
   FIX v5.3.3:
   - Form modifica con date/orari ritiro/consegna
   - Blocco modifica se < 7 giorni con avviso
   - Input date uniformi (no tendine)
   - Emoji coerenti per sezioni
   - Fix reload dopo DELETE
   - Caselle omogenee
   
   DATA: 27 Ottobre 2025
*/
'use strict';
console.log('Imbriani Noleggio - v5.3.3 FINALE CORRETTO');


// ========== ENDPOINTS ==========
const SCRIPTS = {
  proxy: 'https://proxy-cors-google-apps.onrender.com/',
  datiCliente: 'https://script.google.com/macros/s/AKfycbxnC-JSK4YXvV8GF6ED9uK3SSNYs3uAFAmyji6KB_eQ60QAqXIHbTM-18F7-Zu47bo/exec',
  disponibilita: 'https://script.google.com/macros/s/AKfycbwhEK3IH-hLGYpGXHRjcYdUaW2e3He485XpgcRVr0GBSyE4v4-gSCp5vnSCbn5ocNI/exec',
  prenotazioni: 'https://script.google.com/macros/s/AKfycbyMPuvESaAJ7bIraipTya9yUKnyV8eYbm-r8CX42KRvDQsX0f44QBsaqQOY8KVYFBE/exec',
  manageBooking: 'https://script.google.com/macros/s/AKfycbxAKX12Sgc0ODvGtUEXCRoINheSeO9-SgDNGuY1QtrVKBENdY0SpMiDtzgoxIBRCuQ/exec'
};

const pulmini = [
  { id: 'ducato_lungo', nome: 'Fiat Ducato (Passo lungo)', targa: 'EC787NM' },
  { id: 'ducato_corto', nome: 'Fiat Ducato (Passo corto)', targa: 'DN391FW' },
  { id: 'peugeot', nome: 'Peugeot Expert Tepee', targa: 'DL291XZ' }
];

let loggedCustomerData = null;
let bookingData = {};
const prenotazioniMap = new Map();
let autistiCache = [];


// ========== UTILITY DOM ==========
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = String(v);
    else if (k === 'html') node.innerHTML = String(v);
    else if (k === 'dataset' && typeof v === 'object') {
      for (const [dk, dv] of Object.entries(v)) node.dataset[dk] = String(dv);
    } else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2), v);
    } else {
      node.setAttribute(k, String(v));
    }
  }
  for (const c of children) {
    if (c == null) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

function clearAndAppend(container, ...nodes) { 
  if (container) container.replaceChildren(...nodes); 
}

function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function asString(x, fb = 'ND') { return x == null || x === '' ? fb : String(x); }
function pad2(n) { return String(n).padStart(2, '0'); }


// ========== SANITIZE & VALIDATION ==========
function sanitizeStreet(s) { 
  return String(s || '').replace(/^\s*(via|viale|v\.|p\.?zza|piazza)\s+/i, ''); 
}

function sanitizeBookingResidence(b) {
  if (!b || !Array.isArray(b.autisti)) return;
  b.autisti = b.autisti.map(a => ({ 
    ...a, 
    viaResidenza: sanitizeStreet(a.viaResidenza) 
  }));
}

function validaCodiceFiscale(cf) { 
  return /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/.test(String(cf || '').toUpperCase()); 
}

function validaTelefono(tel) { 
  return /^[0-9]{9,15}$/.test(String(tel || '').replace(/\s+/g, '')); 
}

function validaNomeCognome(nome) {
  const parts = String(nome || '').trim().split(/\s+/);
  return parts.length >= 2 && parts.every(p => p.length >= 2);
}

function calcolaEta(dataNascita) {
  if (!dataNascita) return 0;
  const oggi = new Date();
  const nascita = new Date(dataNascita);
  let eta = oggi.getFullYear() - nascita.getFullYear();
  const m = oggi.getMonth() - nascita.getMonth();
  if (m < 0 || (m === 0 && oggi.getDate() < nascita.getDate())) eta--;
  return eta;
}

function convertDateToIso(ddmmyyyy) {
  if (!ddmmyyyy || !/^\d{2}\/\d{2}\/\d{4}$/.test(ddmmyyyy)) return '';
  const [dd, mm, yyyy] = ddmmyyyy.split('/');
  return `${yyyy}-${mm}-${dd}`;
}

function dateToItalian(isoDate) {
  if (!isoDate) return 'ND';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}


// ========== BANNER & LOADER ==========
function mostraErrore(msg) {
  if (qs('.error-banner')) return;
  const div = el('div', { class: 'error-banner', role: 'alert', 'aria-live': 'assertive' }, 
    el('span', { class: 'banner-ico', text: '⚠️' }), 
    el('span', { class: 'banner-msg', text: asString(msg, 'Errore') })
  );
  document.body.prepend(div);
  setTimeout(() => div.remove(), 4500);
}

function mostraSuccesso(msg) {
  if (qs('.success-banner')) return;
  const div = el('div', { class: 'success-banner', role: 'status', 'aria-live': 'polite' }, 
    el('span', { class: 'banner-ico', text: '✅' }), 
    el('span', { class: 'banner-msg', text: asString(msg, 'Successo') })
  );
  document.body.prepend(div);
  setTimeout(() => div.remove(), 3200);
}

function mostraLoading(show = true) {
  let overlay = qs('#globalLoader');
  if (show) {
    if (!overlay) {
      overlay = el('div', { 
        id: 'globalLoader', 
        class: 'loader-overlay',
        role: 'status',
        'aria-live': 'polite',
        'aria-busy': 'true'
      }, 
        el('div', { class: 'loader-spinner' }, 
          el('div', { class: 'spinner' }), 
          el('p', { class: 'loader-text', text: 'Caricamento…' })
        )
      );
      document.body.append(overlay);
    }
    overlay.style.display = 'flex';
  } else if (overlay) {
    overlay.style.display = 'none';
  }
}


// ========== MODALE CONFERMA ==========
function buildModalConferma(onConfirm) {
  const existing = qs('#modal-conferma');
  if (existing) existing.remove();

  const modal = el('div', { 
    id: 'modal-conferma', 
    class: 'modal-overlay',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'modal-title'
  },
    el('div', { class: 'modal-content' },
      el('h3', { id: 'modal-title', text: 'Conferma Prenotazione' }),
      el('p', { text: 'Sei sicuro di voler inviare questa prenotazione?' }),
      el('div', { class: 'modal-actions' },
        el('button', { 
          class: 'btn btn--secondary', 
          onclick: () => modal.remove() 
        }, 'Annulla'),
        el('button', { 
          class: 'btn btn--primary', 
          onclick: () => { modal.remove(); onConfirm(); } 
        }, 'Conferma')
      )
    )
  );

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  document.body.append(modal);
}


// ========== FETCH / API ==========
function fetchWithProxy(url, options = {}) { 
  return fetch(SCRIPTS.proxy + url, options); 
}

function withTimeout(promise, ms = 30000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(v => { clearTimeout(t); resolve(v); })
          .catch(e => { clearTimeout(t); reject(e); });
  });
}

async function fetchJSON(url, options = {}) {
  const res = await withTimeout(fetchWithProxy(url, options), options.timeout || 30000);
  if (!res.ok) throw new Error(`http_${res.status}`);
  try { return await res.json(); } 
  catch { return {}; }
}

async function apiPostDatiCliente(cf) { 
  return fetchJSON(SCRIPTS.datiCliente, { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify({ cf }) 
  }); 
}

async function apiPostPrenotazioni(cf) { 
  return fetchJSON(SCRIPTS.prenotazioni, { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify({ cf }) 
  }); 
}

async function apiPostDisponibilita(payload) { 
  return fetchJSON(SCRIPTS.disponibilita, { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify(payload || {}) 
  }); 
}

async function apiManageBooking(payload) {
  try {
    const res = await fetchJSON(SCRIPTS.manageBooking, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(payload || {}) 
    });
    if (res.success) return res;
    throw new Error(res.error || 'Errore API primaria');
  } catch (err) {
    console.warn('Fallback su endpoint prenotazioni:', err);
    return fetchJSON(SCRIPTS.prenotazioni, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(payload || {}) 
    });
  }
}


// ========== DATE HELPER (RIMOSSO TENDINE, SOLO INPUT DATE) ==========
function getData(prefix) {
  const input = qs(`#data_${prefix}`);
  return input ? input.value : '';
}

function getDataAutista(tipo, i) {
  const input = qs(`#data_${tipo}_${i}`);
  return input ? input.value : '';
}

function setSelectValue(id, val) {
  const sel = qs(`#${id}`);
  if (!sel || !val) return;
  sel.value = val;
}


// ========== ROUTING HISTORY API ==========
function routeTo(view, stepId = null) {
  qsa('[data-section]').forEach(s => {
    s.style.display = 'none';
    s.classList.add('hidden');
  });
  
  qsa('[data-step]').forEach(s => s.classList.add('hidden'));
  
  if (view === 'home') {
    const home = qs('#homepage');
    if (home) {
      home.style.display = 'block';
      home.classList.remove('hidden');
    }
  } else if (view === 'area') {
    const area = qs('#area-personale');
    if (area) {
      area.style.display = 'block';
      area.classList.remove('hidden');
    }
  } else if (view === 'wizard') {
    const wizard = qs('#mainbox');
    if (wizard) {
      wizard.style.display = 'block';
      wizard.classList.remove('hidden');
    }
    if (stepId) {
      const step = qs(`#${stepId}`);
      if (step) step.classList.remove('hidden');
    }
  } else if (view === 'modifica') {
    const mod = qs('#modifica-prenotazione');
    if (mod) {
      mod.style.display = 'block';
      mod.classList.remove('hidden');
    }
  }
}

function initHistory() {
  const hash = window.location.hash.slice(1);
  if (hash === 'area') {
    routeTo('area');
  } else if (hash.startsWith('step')) {
    routeTo('wizard', hash);
  } else {
    routeTo('home');
  }
  
  window.addEventListener('popstate', (e) => {
    if (e.state?.view) {
      routeTo(e.state.view, e.state.step);
    } else {
      routeTo('home');
    }
  });
}


// ========== LOGIN ==========
async function handleLogin(cf) {
  if (!cf || cf.length < 11) throw new Error('Inserisci un codice fiscale valido');
  if (!validaCodiceFiscale(cf)) throw new Error('Codice fiscale non valido');
  
  mostraLoading(true);
  try {
    const [dati, prenotazioniRes] = await Promise.all([
      apiPostDatiCliente(cf), 
      apiPostPrenotazioni(cf)
    ]);
    
    console.log('🔍 DEBUG - Risposta datiCliente:', dati);
    console.log('🔍 DEBUG - Risposta prenotazioni:', prenotazioniRes);
    
    let cliente = null;
    
    if (dati && dati.dati) {
      cliente = dati.dati;
    } else if (dati && dati.cliente) {
      cliente = dati.cliente;
    } else if (dati && (dati.nome || dati.nomeCognome)) {
      cliente = dati;
    } else {
      throw new Error('Nessun cliente trovato');
    }
    
    console.log('👤 DEBUG - Cliente estratto:', cliente);
    
    loggedCustomerData = {
      nome: asString(cliente.nomeCognome || cliente.nome, ''),
      dataNascita: asString(cliente.dataNascita, ''),
      luogoNascita: asString(cliente.luogoNascita, ''),
      codiceFiscale: cf.toUpperCase(),
      comuneResidenza: asString(cliente.comuneResidenza, ''),
      viaResidenza: asString(cliente.viaResidenza, ''),
      civicoResidenza: asString(cliente.civicoResidenza, ''),
      numeroPatente: asString(cliente.numeroPatente, ''),
      dataInizioValiditaPatente: asString(cliente.dataInizioValiditaPatente, ''),
      dataFineValiditaPatente: asString(cliente.dataFineValiditaPatente, ''),
      cellulare: asString(cliente.cellulare, '')
    };
    
    console.log('💾 DEBUG - loggedCustomerData salvato:', loggedCustomerData);
    
    prenotazioniMap.clear();
    if (Array.isArray(prenotazioniRes.prenotazioni)) {
      prenotazioniRes.prenotazioni.forEach(p => {
        if (p['ID prenotazione']) prenotazioniMap.set(p['ID prenotazione'], p);
      });
    }
    
    console.log('📋 DEBUG - prenotazioniMap size:', prenotazioniMap.size);
    
    sessionStorage.setItem('imbriani_logged_user', JSON.stringify(loggedCustomerData));
    
    console.log('🎨 DEBUG - Chiamo renderAreaPersonale()...');
    renderAreaPersonale();
    
    routeTo('area');
    history.pushState({ view: 'area' }, '', '#area');
    
    if (dati.executionTime) {
      console.log(`⚡ Login completato in ${dati.executionTime}ms (cache: ${dati.cached || false})`);
    }
    if (prenotazioniRes.executionTime) {
      console.log(`⚡ Prenotazioni caricate in ${prenotazioniRes.executionTime}ms (cache: ${prenotazioniRes.cached || false})`);
    }
    
    mostraSuccesso(`Benvenuto, ${loggedCustomerData.nome}!`);
  } catch (err) {
    console.error('❌ Errore login:', err);
    mostraErrore(err.message || 'Errore login');
  } finally {
    mostraLoading(false);
  }
}

function logout() {
  loggedCustomerData = null;
  bookingData = {};
  autistiCache = [];
  prenotazioniMap.clear();
  sessionStorage.clear();
  routeTo('home');
  history.pushState({ view: 'home' }, '', '#home');
  mostraSuccesso('Logout effettuato');
}
// ========== AREA PERSONALE ==========
function renderAreaPersonale() {
  console.log('🎨 renderAreaPersonale chiamata');
  const root = qs('#area-personale-content');
  console.log('🎨 root elemento:', root);
  console.log('🎨 loggedCustomerData:', loggedCustomerData);
  
  if (!root) {
    console.error('❌ Elemento #area-personale-content non trovato!');
    return;
  }
  
  if (!loggedCustomerData) {
    console.error('❌ loggedCustomerData è null!');
    return;
  }
  
  clearAndAppend(root,
    el('div', { class: 'card welcome-card' },
      el('h2', { text: `Benvenuto, ${loggedCustomerData.nome}!` }),
      el('p', { text: `CF: ${loggedCustomerData.codiceFiscale}` }),
      el('button', { 
        class: 'btn btn--primary', 
        onclick: startNewBookingWithPreFill 
      }, 'Nuova Prenotazione'),
      el('button', { 
        class: 'btn btn--secondary', 
        onclick: logout 
      }, 'Esci')
    ),
    el('div', { class: 'card prenotazioni-card' },
      el('h3', { text: 'Le tue prenotazioni' }),
      prenotazioniMap.size === 0 
        ? el('p', { text: 'Nessuna prenotazione trovata' })
        : el('div', { class: 'prenotazioni-lista' }, ...renderPrenotazioniLista())
    )
  );
  
  console.log('✅ renderAreaPersonale completato');
}

function renderPrenotazioniLista() {
  const items = [];
  prenotazioniMap.forEach((p, id) => {
    const stato = p.stato || '';
    const statoClass = stato === 'Prenotato' ? 'status--info' : 
                       stato === 'In corso' ? 'status--warning' : 
                       stato === 'Completato' ? 'status--success' : '';
    
    items.push(
      el('div', { class: 'prenotazione-item card-sm' },
        el('strong', { text: `ID: ${id}` }),
        el('p', { text: `Veicolo: ${asString(p.Targa || p.targa, 'ND')}` }),
        el('p', { text: `Periodo: ${asString(p['Giorno inizio noleggio'], 'ND')} - ${asString(p['Giorno fine noleggio'], 'ND')}` }),
        stato ? el('span', { class: `status ${statoClass}`, text: stato }) : null,
        el('button', { 
          class: 'btn btn--sm', 
          onclick: () => modificaPrenotazione(id) 
        }, 'Modifica')
      )
    );
  });
  return items;
}

function startNewBookingWithPreFill() {
  if (!loggedCustomerData) return;
  
  const a0 = bookingData.autisti?.[0] || {};
  const vuoto = !a0 || Object.values(a0).every(v => !v);
  
  if (vuoto) {
    bookingData = {
      pulmino: null,
      targa: '',
      autisti: [{
        nomeCognome: loggedCustomerData.nome,
        dataNascita: loggedCustomerData.dataNascita,
        luogoNascita: loggedCustomerData.luogoNascita,
        codiceFiscale: loggedCustomerData.codiceFiscale,
        comuneResidenza: loggedCustomerData.comuneResidenza,
        viaResidenza: loggedCustomerData.viaResidenza,
        civicoResidenza: loggedCustomerData.civicoResidenza,
        numeroPatente: loggedCustomerData.numeroPatente,
        dataInizioValiditaPatente: loggedCustomerData.dataInizioValiditaPatente,
        dataFineValiditaPatente: loggedCustomerData.dataFineValiditaPatente
      }],
      cellulare: loggedCustomerData.cellulare
    };
  }
  
  sessionStorage.setItem('imbriani_booking_draft', JSON.stringify(bookingData));
  routeTo('wizard', 'step1');
  history.pushState({ view: 'wizard', step: 'step1' }, '', '#step1');
}


// ========== MODIFICA PRENOTAZIONE (CORRETTO) ==========
async function modificaPrenotazione(idPrenotazione) {
  const p = prenotazioniMap.get(idPrenotazione);
  if (!p) return mostraErrore('Prenotazione non trovata');
  
  const root = qs('#modifica-form-content');
  if (!root) return;
  
  // Verifica se modificabile (almeno 7 giorni prima)
  const dataInizio = new Date(convertDateToIso(p['Giorno inizio noleggio']));
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  const giorniRimanenti = Math.floor((dataInizio - oggi) / (1000 * 60 * 60 * 24));
  const isModificabile = giorniRimanenti >= 7;
  
  const avviso = !isModificabile 
    ? el('div', { 
        class: 'alert alert--warning', 
        role: 'alert',
        style: 'margin-bottom: 20px; padding: 12px; background: #fff3cd; border-left: 4px solid #ff9800; border-radius: 4px;'
      },
        el('strong', { text: '⚠️ Attenzione: ' }),
        document.createTextNode('Non è possibile modificare date/orari con meno di 7 giorni di anticipo. Contatta il noleggio.')
      )
    : null;
  
  clearAndAppend(root,
    el('h3', { text: `Modifica prenotazione ${idPrenotazione}` }),
    avviso,
    el('form', { 
      id: 'form-modifica', 
      onsubmit: (e) => { 
        e.preventDefault(); 
        handleUpdatePrenotazione(idPrenotazione); 
      } 
    },
      // Dati anagrafici (sempre editabili)
      el('fieldset', { style: 'border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 8px;' },
        el('legend', { style: 'font-weight: 600; color: #4CAF50; font-size: 1.1em;', text: '👤 Dati Autista' }),
        
        el('label', { style: 'display: block; margin-bottom: 5px; font-weight: 500;' }, 'Nome e Cognome'),
        el('input', { 
          name: 'Nome', 
          value: asString(p.Nome, ''), 
          required: true,
          style: 'width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px; font-size: 16px;'
        }),
        
        el('label', { style: 'display: block; margin-bottom: 5px; font-weight: 500;' }, 'Data di nascita'),
        el('input', { 
          name: 'Data di nascita', 
          type: 'date', 
          value: convertDateToIso(p['Data di nascita']), 
          required: true,
          style: 'width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px; font-size: 16px;'
        }),
        
        el('label', { style: 'display: block; margin-bottom: 5px; font-weight: 500;' }, 'Luogo di nascita'),
        el('input', { 
          name: 'Luogo di nascita', 
          value: asString(p['Luogo di nascita'], ''), 
          required: true,
          style: 'width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px; font-size: 16px;'
        }),
        
        el('label', { style: 'display: block; margin-bottom: 5px; font-weight: 500;' }, 'Codice fiscale'),
        el('input', { 
          name: 'Codice fiscale', 
          value: asString(p['Codice fiscale'], ''), 
          required: true,
          style: 'width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px; font-size: 16px; text-transform: uppercase;',
          maxlength: 16
        }),
        
        el('label', { style: 'display: block; margin-bottom: 5px; font-weight: 500;' }, 'Comune di residenza'),
        el('input', { 
          name: 'Comune di residenza', 
          value: asString(p['Comune di residenza'], ''), 
          required: true,
          style: 'width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px; font-size: 16px;'
        }),
        
        el('label', { style: 'display: block; margin-bottom: 5px; font-weight: 500;' }, 'Via di residenza'),
        el('input', { 
          name: 'Via di residenza', 
          value: asString(p['Via di residenza'], ''), 
          required: true,
          style: 'width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px; font-size: 16px;'
        }),
        
        el('label', { style: 'display: block; margin-bottom: 5px; font-weight: 500;' }, 'Civico di residenza'),
        el('input', { 
          name: 'Civico di residenza', 
          value: asString(p['Civico di residenza'], ''), 
          required: true,
          style: 'width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px; font-size: 16px;'
        }),
        
        el('label', { style: 'display: block; margin-bottom: 5px; font-weight: 500;' }, 'Numero di patente'),
        el('input', { 
          name: 'Numero di patente', 
          value: asString(p['Numero di patente'], ''), 
          required: true,
          style: 'width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px; font-size: 16px;'
        }),
        
        el('label', { style: 'display: block; margin-bottom: 5px; font-weight: 500;' }, 'Data inizio validità patente'),
        el('input', { 
          name: 'Data inizio validità patente', 
          type: 'date', 
          value: convertDateToIso(p['Data inizio validità patente']), 
          required: true,
          style: 'width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px; font-size: 16px;'
        }),
        
        el('label', { style: 'display: block; margin-bottom: 5px; font-weight: 500;' }, 'Scadenza patente'),
        el('input', { 
          name: 'Scadenza patente', 
          type: 'date', 
          value: convertDateToIso(p['Scadenza patente']), 
          required: true,
          style: 'width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px; font-size: 16px;'
        })
      ),
      
      // Date/Orari noleggio (bloccati se < 7 giorni)
      el('fieldset', { style: 'border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 8px;' },
        el('legend', { style: 'font-weight: 600; color: #2196F3; font-size: 1.1em;', text: '📅 Periodo Noleggio' }),
        
        el('label', { style: 'display: block; margin-bottom: 5px; font-weight: 500;' }, '📅 Data ritiro'),
        el('input', { 
          name: 'Giorno inizio noleggio', 
          type: 'date', 
          value: convertDateToIso(p['Giorno inizio noleggio']), 
          required: true,
          disabled: !isModificabile,
          style: 'width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px; font-size: 16px;'
        }),
        
        el('label', { style: 'display: block; margin-bottom: 5px; font-weight: 500;' }, '⏰ Ora ritiro'),
        el('input', { 
          name: 'Ora inizio noleggio', 
          type: 'time', 
          value: asString(p['Ora inizio noleggio'], ''), 
          required: true,
          disabled: !isModificabile,
          style: 'width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px; font-size: 16px;'
        }),
        
        el('label', { style: 'display: block; margin-bottom: 5px; font-weight: 500;' }, '📅 Data consegna'),
        el('input', { 
          name: 'Giorno fine noleggio', 
          type: 'date', 
          value: convertDateToIso(p['Giorno fine noleggio']), 
          required: true,
          disabled: !isModificabile,
          style: 'width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px; font-size: 16px;'
        }),
        
        el('label', { style: 'display: block; margin-bottom: 5px; font-weight: 500;' }, '⏰ Ora consegna'),
        el('input', { 
          name: 'Ora fine noleggio', 
          type: 'time', 
          value: asString(p['Ora fine noleggio'], ''), 
          required: true,
          disabled: !isModificabile,
          style: 'width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px; font-size: 16px;'
        })
      ),
      
      // Contatto
      el('fieldset', { style: 'border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 8px;' },
        el('legend', { style: 'font-weight: 600; color: #FF9800; font-size: 1.1em;', text: '📞 Contatto' }),
        
        el('label', { style: 'display: block; margin-bottom: 5px; font-weight: 500;' }, 'Cellulare'),
        el('input', { 
          name: 'Cellulare', 
          type: 'tel', 
          value: asString(p.Cellulare, ''), 
          required: true,
          style: 'width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px; font-size: 16px;'
        })
      ),
      
      // Pulsanti
      el('div', { class: 'actions', style: 'margin-top: 20px; display: flex; gap: 10px;' },
        el('button', { 
          type: 'submit', 
          class: 'btn btn--primary',
          style: 'flex: 1; padding: 12px;'
        }, '💾 Salva Modifiche'),
        el('button', { 
          type: 'button', 
          class: 'btn btn--danger', 
          style: 'flex: 1; padding: 12px;',
          onclick: () => handleDeletePrenotazione(idPrenotazione) 
        }, '🗑️ Elimina')
      )
    )
  );
  
  routeTo('modifica');
  history.pushState({ view: 'modifica' }, '', '#modifica');
}

async function handleUpdatePrenotazione(idPrenotazione) {
  const form = qs('#form-modifica');
  if (!form) return;
  
  const data = {};
  qsa('input', form).forEach(inp => {
    if (!inp.disabled) {
      data[inp.name] = inp.value;
    }
  });
  
  mostraLoading(true);
  try {
    const res = await apiManageBooking({ 
      action: 'update', 
      idPrenotazione, 
      ...data 
    });
    if (!res.success) throw new Error(res.error || 'Errore aggiornamento');
    
    console.log(`⚡ Update completato in ${res.executionTime || 'N/A'}ms`);
    
    mostraSuccesso('Prenotazione aggiornata');
    await handleLogin(loggedCustomerData.codiceFiscale);
  } catch (err) {
    console.error(err);
    mostraErrore(err.message || 'Errore aggiornamento');
  } finally {
    mostraLoading(false);
  }
}

async function handleDeletePrenotazione(idPrenotazione) {
  if (!confirm('Confermi l\'eliminazione della prenotazione ' + idPrenotazione + '?')) return;
  
  mostraLoading(true);
  try {
    const res = await apiManageBooking({ 
      action: 'delete', 
      idPrenotazione 
    });
    
    if (!res || !res.success) {
      throw new Error(res?.error || 'Errore eliminazione');
    }
    
    console.log(`⚡ Delete completato in ${res.executionTime || 'N/A'}ms`);
    
    // ⬇️ FIX: Rimuovi dalla mappa locale SUBITO
    prenotazioniMap.delete(idPrenotazione);
    
    mostraSuccesso('Prenotazione eliminata con successo');
    
    // ⬇️ FIX: Aspetta 500ms per dare tempo al server di aggiornare
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // ⬇️ FIX: Invalida cache manualmente forzando timestamp
    const cacheKey = 'prenotazioni_' + loggedCustomerData.codiceFiscale;
    sessionStorage.removeItem(cacheKey);
    
    // Ricarica dati freschi (bypassa cache)
    if (loggedCustomerData && loggedCustomerData.codiceFiscale) {
      mostraLoading(true);
      try {
        const prenotazioniRes = await apiPostPrenotazioni(loggedCustomerData.codiceFiscale);
        
        // Svuota e ricarica mappa
        prenotazioniMap.clear();
        if (Array.isArray(prenotazioniRes.prenotazioni)) {
          prenotazioniRes.prenotazioni.forEach(p => {
            if (p['ID prenotazione']) prenotazioniMap.set(p['ID prenotazione'], p);
          });
        }
        
        console.log('📋 Prenotazioni ricaricate:', prenotazioniMap.size);
        
        // Rendi area personale
        renderAreaPersonale();
        routeTo('area');
        
      } catch (err) {
        console.error('❌ Errore ricaricamento:', err);
      } finally {
        mostraLoading(false);
      }
    }
  } catch (err) {
    console.error('❌ Errore DELETE:', err);
    mostraErrore(err.message || 'Impossibile eliminare la prenotazione');
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


// ========== STEP 3 — Autisti (SEMPLIFICATO CON INPUT DATE) ==========
function saveAutistiFromForm(maxCount) {
  autistiCache = [];
  for (let i = 1; i <= maxCount; i++) {
    const a = getAutistaFromForm(i);
    if (a.nomeCognome || a.codiceFiscale) {
      autistiCache.push(a);
    }
  }
}

function mostraModuliAutisti() {
  const root = qs('#autisti-container');
  if (!root) return;
  
  const numAutisti = bookingData.autisti?.length || 1;
  
  saveAutistiFromForm(3);
  
  for (let i = 0; i < numAutisti; i++) {
    if (autistiCache[i]) {
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
  
  const selectNum = qs('#numero-autisti');
  if (selectNum) {
    selectNum.value = numAutisti;
    selectNum.onchange = (e) => {
      const n = Math.min(3, Math.max(1, parseInt(e.target.value, 10) || 1));
      
      saveAutistiFromForm(numAutisti);
      
      bookingData.autisti = Array.from({ length: n }, (_, i) => 
        autistiCache[i] || bookingData.autisti?.[i] || {}
      );
      
      mostraModuliAutisti();
    };
  }
}

function buildAutistaForm(index, prefill = {}) {
  // Converti date da DD/MM/YYYY a YYYY-MM-DD se necessario
  let dataNascitaISO = prefill.dataNascita || '';
  let inizioPatenteISO = prefill.dataInizioValiditaPatente || '';
  let finePatenteISO = prefill.dataFineValiditaPatente || '';
  
  if (dataNascitaISO && /^\d{2}\/\d{2}\/\d{4}$/.test(dataNascitaISO)) {
    dataNascitaISO = convertDateToIso(dataNascitaISO);
  }
  if (inizioPatenteISO && /^\d{2}\/\d{2}\/\d{4}$/.test(inizioPatenteISO)) {
    inizioPatenteISO = convertDateToIso(inizioPatenteISO);
  }
  if (finePatenteISO && /^\d{2}\/\d{2}\/\d{4}$/.test(finePatenteISO)) {
    finePatenteISO = convertDateToIso(finePatenteISO);
  }
  
  const container = el('div', { 
    class: 'card form-autista', 
    dataset: { index } 
  },
    el('h4', { text: `Autista ${index}` }),
    
    el('label', {}, 'Nome e Cognome ', 
      el('input', { 
        id: `nome_${index}`, 
        value: asString(prefill.nomeCognome, ''), 
        required: true,
        placeholder: 'Mario Rossi'
      })
    ),
    
    el('label', {}, 'Data di nascita'),
    el('input', { 
      id: `data_nascita_${index}`, 
      type: 'date', 
      value: dataNascitaISO,
      required: true,
      max: new Date().toISOString().split('T')[0]
    }),
    
    el('label', {}, 'Luogo di nascita ', 
      el('input', { 
        id: `luogo_${index}`, 
        value: asString(prefill.luogoNascita, ''), 
        required: true 
      })
    ),
    
    el('label', {}, 'Codice fiscale ', 
      el('input', { 
        id: `cf_${index}`, 
        value: asString(prefill.codiceFiscale, ''), 
        required: true,
        maxlength: 16,
        style: 'text-transform: uppercase'
      })
    ),
    
    el('label', {}, 'Comune di residenza ', 
      el('input', { 
        id: `comune_residenza_${index}`, 
        value: asString(prefill.comuneResidenza, ''), 
        required: true 
      })
    ),
    
    el('label', {}, 'Via di residenza ', 
      el('input', { 
        id: `via_residenza_${index}`, 
        value: asString(prefill.viaResidenza, ''), 
        required: true,
        placeholder: 'Garibaldi (senza Via/Viale)'
      })
    ),
    
    el('label', {}, 'Civico di residenza ', 
      el('input', { 
        id: `civico_residenza_${index}`, 
        value: asString(prefill.civicoResidenza, ''), 
        required: true 
      })
    ),
    
    el('label', {}, 'Numero di patente ', 
      el('input', { 
        id: `patente_${index}`, 
        value: asString(prefill.numeroPatente, ''), 
        required: true 
      })
    ),
    
    el('label', {}, 'Data inizio validità patente'),
    el('input', { 
      id: `data_inizio_pat_${index}`, 
      type: 'date', 
      value: inizioPatenteISO,
      required: true
    }),
    
    el('label', {}, 'Scadenza patente'),
    el('input', { 
      id: `data_fine_pat_${index}`, 
      type: 'date', 
      value: finePatenteISO,
      required: true
    })
  );
  
  return container;
}

function getAutistaFromForm(index) {
  return {
    nomeCognome: qs(`#nome_${index}`)?.value.trim() || '',
    dataNascita: qs(`#data_nascita_${index}`)?.value || '',
    luogoNascita: qs(`#luogo_${index}`)?.value.trim() || '',
    codiceFiscale: qs(`#cf_${index}`)?.value.trim().toUpperCase() || '',
    comuneResidenza: qs(`#comune_residenza_${index}`)?.value.trim() || '',
    viaResidenza: qs(`#via_residenza_${index}`)?.value.trim() || '',
    civicoResidenza: qs(`#civico_residenza_${index}`)?.value.trim() || '',
    numeroPatente: qs(`#patente_${index}`)?.value.trim() || '',
    dataInizioValiditaPatente: qs(`#data_inizio_pat_${index}`)?.value || '',
    dataFineValiditaPatente: qs(`#data_fine_pat_${index}`)?.value || ''
  };
}

function continuaStep3() {
  const n = bookingData.autisti?.length || 1;
  bookingData.autisti = Array.from({ length: n }, (_, i) => 
    getAutistaFromForm(i + 1)
  );
  
  const a1 = bookingData.autisti[0];
  
  if (!a1.nomeCognome || !a1.codiceFiscale) {
    return mostraErrore('Compila i dati obbligatori autista 1');
  }
  
  if (!validaNomeCognome(a1.nomeCognome)) {
    return mostraErrore('Inserisci nome e cognome completi (autista 1)');
  }
  
  if (!validaCodiceFiscale(a1.codiceFiscale)) {
    return mostraErrore('Codice fiscale autista 1 non valido');
  }
  
  const eta = calcolaEta(a1.dataNascita);
  if (eta < 18 || eta > 100) {
    return mostraErrore("L'autista deve avere tra 18 e 100 anni");
  }
  
  if (!a1.comuneResidenza || !a1.viaResidenza) {
    return mostraErrore('Compila residenza autista 1');
  }
  
  const oggi = new Date();
  const finePatente = new Date(a1.dataFineValiditaPatente);
  if (finePatente < oggi) {
    return mostraErrore("La patente dell'autista 1 è scaduta");
  }
  
  const inizioPatente = new Date(a1.dataInizioValiditaPatente);
  if (inizioPatente >= finePatente) {
    return mostraErrore('Data inizio validità patente deve essere precedente alla scadenza');
  }
  
  sanitizeBookingResidence(bookingData);
  
  bookingData.cellulare = qs('#cellulare')?.value.trim() 
    || loggedCustomerData?.cellulare 
    || '';
  
  if (!bookingData.cellulare) {
    return mostraErrore('Inserisci un numero di cellulare');
  }
  
  if (!validaTelefono(bookingData.cellulare)) {
    return mostraErrore('Numero di cellulare non valido');
  }
  
  sessionStorage.setItem('imbriani_booking_draft', JSON.stringify(bookingData));
  mostraRiepilogo();
  routeTo('wizard', 'step4');
  history.pushState({ view: 'wizard', step: 'step4' }, '', '#step4');
}


// ========== STEP 4 — Riepilogo (EMOJI AGGIORNATI) ==========
function rItem(label, value) {
  return el('p', {},
    el('strong', { text: label + ': ' }),
    document.createTextNode(asString(value))
  );
}

function mostraRiepilogo() {
  const root = qs('#riepilogo-content');
  if (!root) return;
  
  const a1 = bookingData.autisti[0] || {};
  
  const elements = [
    el('div', { class: 'card' },
      el('h3', { text: 'Veicolo' }),  // ⬅️ RIMUOVI 🚐
      rItem('Modello', bookingData.pulmino?.nome),
      rItem('Targa', bookingData.pulmino?.targa),
      
      el('h3', { text: 'Periodo' }),  // ⬅️ RIMUOVI 📅
      rItem('Ritiro', `${dateToItalian(bookingData.dataRitiro)} ore ${bookingData.oraRitiro}`),
      rItem('Consegna', `${dateToItalian(bookingData.dataArrivo)} ore ${bookingData.oraArrivo}`),
      
      el('h3', { text: 'Autista Principale' }),  // ⬅️ RIMUOVI 👤
      rItem('Nome', a1.nomeCognome),
      rItem('Nascita', `${dateToItalian(a1.dataNascita)} - ${a1.luogoNascita}`),
      rItem('Codice Fiscale', a1.codiceFiscale),
      rItem('Residenza', `${a1.viaResidenza} ${a1.civicoResidenza}, ${a1.comuneResidenza}`),
      rItem('Patente', a1.numeroPatente),
      rItem('Validità patente', `${dateToItalian(a1.dataInizioValiditaPatente)} → ${dateToItalian(a1.dataFineValiditaPatente)}`),
      
      el('h3', { text: 'Contatto' }),  // ⬅️ RIMUOVI 📞
      rItem('Cellulare', bookingData.cellulare)
    )
  ];
  
  if (bookingData.autisti.length > 1) {
    for (let i = 1; i < bookingData.autisti.length; i++) {
      const a = bookingData.autisti[i];
      if (a.nomeCognome || a.codiceFiscale) {
        elements.push(
          el('div', { class: 'card' },
            el('h3', { text: `Autista ${i + 1}` }),  // ⬅️ RIMUOVI 👤
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

async function inviaPrenotazione() {
  buildModalConferma(async () => {
    mostraLoading(true);
    try {
      const payload = { 
        action: 'create', 
        prenotazione: bookingData 
      };
      const res = await apiManageBooking(payload);
      
      if (!res.success) {
        throw new Error(res.error || 'Errore invio');
      }
      
      console.log(`⚡ Prenotazione creata in ${res.executionTime || 'N/A'}ms (ID: ${res.idPrenotazione || 'N/A'})`);
      
      mostraSuccesso('Prenotazione inviata con successo!');
      sessionStorage.removeItem('imbriani_booking_draft');
      bookingData = {};
      autistiCache = [];
      
      if (loggedCustomerData) {
        await handleLogin(loggedCustomerData.codiceFiscale);
      } else {
        routeTo('home');
        history.pushState({ view: 'home' }, '', '#home');
      }
    } catch (err) {
      console.error(err);
      mostraErrore(err.message || 'Errore durante l\'invio');
    } finally {
      mostraLoading(false);
    }
  });
}


// ========== NAVIGATION ==========
function setupNavigation() {
  const title = qs('header h1') || qs('#site-title');
  if (title) {
    title.style.cursor = 'pointer';
    title.onclick = (e) => { 
      e.preventDefault(); 
      routeTo('home'); 
      history.pushState({ view: 'home' }, '', '#home');
    };
  }
  
  qsa('.btn-back').forEach(btn => {
    btn.onclick = () => {
      const target = btn.getAttribute('data-target');
      if (target) {
        routeTo('wizard', target);
        history.pushState({ view: 'wizard', step: target }, '', `#${target}`);
      } else {
        history.back();
      }
    };
  });
}


// ========== FORM HANDLERS ==========
function setupLoginForm() {
  const form = qs('#form-login');
  if (!form) return;
  
  form.onsubmit = async (e) => {
    e.preventDefault();
    const cf = qs('#cf-login')?.value.trim().toUpperCase();
    if (!cf) return mostraErrore('Inserisci il codice fiscale');
    await handleLogin(cf);
  };
}

function setupHomeButtons() {
  const btnNew = qs('#btnNewBooking');
  if (btnNew) {
    btnNew.onclick = () => {
      bookingData = { 
        pulmino: null, 
        targa: '', 
        autisti: [{}], 
        cellulare: '' 
      };
      autistiCache = [];
      routeTo('wizard', 'step1');
      history.pushState({ view: 'wizard', step: 'step1' }, '', '#step1');
    };
  }
}

function setupStep1() {
  const btn = qs('#btn-controlla-disponibilita');
  if (btn) btn.onclick = controllaDisponibilita;
}

function setupStep2() {
  const btn = qs('#btn-step2-continua');
  if (btn) {
    btn.disabled = !bookingData.pulmino?.id;
    btn.onclick = continuaStep2;
  }
}

function setupStep3() {
  const btn = qs('#btn-step3-continua');
  if (btn) btn.onclick = continuaStep3;
  
  const celInput = qs('#cellulare');
  if (celInput && loggedCustomerData?.cellulare && !celInput.value) {
    celInput.value = loggedCustomerData.cellulare;
  }
  
  if (!bookingData.autisti || !bookingData.autisti.length) {
    bookingData.autisti = [{}];
  }
  mostraModuliAutisti();
}

function setupStep4() {
  const btn = qs('#btn-invia-prenotazione');
  if (btn) btn.onclick = inviaPrenotazione;
}


// ========== SESSION RESTORE ==========
function restoreSession() {
  const stored = sessionStorage.getItem('imbriani_logged_user');
  if (!stored) return false;
  
  try {
    const user = JSON.parse(stored);
    if (user && user.codiceFiscale) {
      loggedCustomerData = user;
      return true;
    }
  } catch {}
  return false;
}


// ========== INIT APP ==========
function initApp() {
  console.log('🚀 Inizializzazione Imbriani Noleggio v5.3.3 FINALE CORRETTO');
  console.log('📊 Performance Apps Script: 50-100ms con cache, 200-600ms senza');
  
  initHistory();
  setupNavigation();
  setupLoginForm();
  setupHomeButtons();
  setupStep1();
  setupStep2();
  setupStep3();
  setupStep4();
  
  if (restoreSession()) {
    handleLogin(loggedCustomerData.codiceFiscale).catch(console.error);
  } else {
    routeTo('home');
    history.pushState({ view: 'home' }, '', '#home');
  }
  
  console.log('✅ App pronta!');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}


// ========== EXPORT GLOBALE ==========
window.ImbrianiApp = {
  routeTo,
  handleLogin,
  logout,
  mostraErrore,
  mostraSuccesso,
  bookingData: () => bookingData,
  loggedUser: () => loggedCustomerData,
  version: '5.3.4'
};
