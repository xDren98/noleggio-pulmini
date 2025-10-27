/* Imbriani Noleggio – scripts.js COMPLETO ALLINEATO HTML
   Versione 5.2.0 FINALE
   - Proxy CORS, card veicoli, residenza completa, login area personale
   - ID allineati al tuo index.html (giorno_ritiro/mese_ritiro/anno_ritiro, ecc.)
   - Date con select gg/mm/aaaa, orari fissi 08/12/16/20
*/
'use strict';
console.log('Imbriani Noleggio - v5.2.0 FINALE');

// Endpoints (tutti via proxy)
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

/* ========== UTILITY ========== */
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
function clearAndAppend(container, ...nodes) { if (container) container.replaceChildren(...nodes); }
function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function asString(x, fb = '') { return x == null ? fb : String(x); }

function sanitizeStreet(s) { return String(s || '').replace(/^\s*(via|viale|v\.|p\.?zza|piazza)\s+/i, ''); }
function sanitizeBookingResidence(b) {
  if (!b || !Array.isArray(b.autisti)) return;
  b.autisti = b.autisti.map(a => ({ ...a, viaResidenza: sanitizeStreet(a.viaResidenza) }));
}

function validaCodiceFiscale(cf) { return /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/.test(String(cf || '').toUpperCase()); }
function validaTelefono(tel) { return /^[0-9]{9,15}$/.test(String(tel || '').replace(/\s+/g, '')); }
function convertDateToIso(ddmmyyyy) {
  if (!ddmmyyyy || !/^\d{2}\/\d{2}\/\d{4}$/.test(ddmmyyyy)) return '';
  const [dd, mm, yyyy] = ddmmyyyy.split('/');
  return `${yyyy}-${mm}-${dd}`;
}

/* ========== BANNER & LOADER ========== */
function mostraErrore(msg) {
  if (qs('.error-banner')) return;
  const div = el('div', { class: 'error-banner' }, el('span', { class: 'banner-ico', text: '⚠️' }), el('span', { class: 'banner-msg', text: asString(msg) }));
  document.body.prepend(div);
  setTimeout(() => div.remove(), 4500);
}
function mostraSuccesso(msg) {
  if (qs('.success-banner')) return;
  const div = el('div', { class: 'success-banner' }, el('span', { class: 'banner-ico', text: '✅' }), el('span', { class: 'banner-msg', text: asString(msg) }));
  document.body.prepend(div);
  setTimeout(() => div.remove(), 3200);
}
function mostraLoading(show = true) {
  let overlay = qs('#globalLoader');
  if (show) {
    if (!overlay) {
      overlay = el('div', { id: 'globalLoader', class: 'loader-overlay' }, el('div', { class: 'loader-spinner' }, el('div', { class: 'spinner' }), el('p', { class: 'loader-text', text: 'Caricamento…' })));
      document.body.append(overlay);
    }
    overlay.style.display = 'flex';
  } else if (overlay) {
    overlay.style.display = 'none';
  }
}

/* ========== FETCH / API ========== */
function fetchWithProxy(url, options = {}) { return fetch(SCRIPTS.proxy + encodeURIComponent(url), options); }
function withTimeout(promise, ms = 15000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(v => { clearTimeout(t); resolve(v); }).catch(e => { clearTimeout(t); reject(e); });
  });
}
async function fetchJSON(url, options = {}) {
  const res = await withTimeout(fetchWithProxy(url, options), options.timeout || 15000);
  if (!res.ok) throw new Error(`http_${res.status}`);
  try { return await res.json(); } catch { return {}; }
}
async function apiPostDatiCliente(cf) { return fetchJSON(SCRIPTS.datiCliente, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cf }) }); }
async function apiPostPrenotazioni(cf) { return fetchJSON(SCRIPTS.prenotazioni, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cf }) }); }
async function apiPostDisponibilita(payload) { return fetchJSON(SCRIPTS.disponibilita, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload || {}) }); }
async function apiManageBooking(payload) { return fetchJSON(SCRIPTS.manageBooking, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload || {}) }); }

/* ========== DATE HELPER ========== */
function popolaSelectDate() {
  const oggi = new Date();
  const annoCorrente = oggi.getFullYear();
  
  [['giorno_ritiro', 'giorno_arrivo'], ['mese_ritiro', 'mese_arrivo'], ['anno_ritiro', 'anno_arrivo']].forEach(([id1, id2]) => {
    const s1 = qs(`#${id1}`), s2 = qs(`#${id2}`);
    if (!s1 || !s2) return;
    
    if (id1.startsWith('giorno')) {
      for (let i = 1; i <= 31; i++) {
        s1.add(new Option(String(i).padStart(2, '0'), i));
        s2.add(new Option(String(i).padStart(2, '0'), i));
      }
      s1.value = oggi.getDate();
      s2.value = oggi.getDate();
    } else if (id1.startsWith('mese')) {
      const mesi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
      mesi.forEach((m, i) => {
        s1.add(new Option(m, i + 1));
        s2.add(new Option(m, i + 1));
      });
      s1.value = oggi.getMonth() + 1;
      s2.value = oggi.getMonth() + 1;
    } else if (id1.startsWith('anno')) {
      for (let y = annoCorrente; y <= annoCorrente + 1; y++) {
        s1.add(new Option(y, y));
        s2.add(new Option(y, y));
      }
      s1.value = annoCorrente;
      s2.value = annoCorrente;
    }
  });
}
function getDateFromSelects(gg, mm, aa) {
  const g = qs(`#${gg}`)?.value, m = qs(`#${mm}`)?.value, a = qs(`#${aa}`)?.value;
  if (!g || !m || !a) return '';
  return `${a}-${String(m).padStart(2, '0')}-${String(g).padStart(2, '0')}`;
}
/* ========== ROUTING ========== */
function showSection(id) {
  qsa('[data-section]').forEach(s => s.style.display = 'none');
  const target = qs(`#${id}`);
  if (target) {
    target.style.display = 'block';
    history.pushState({ section: id }, '', `#${id}`);
  }
}
function showStep(id) {
  qsa('[data-step]').forEach(s => s.classList.add('hidden'));
  const target = qs(`#${id}`);
  if (target) target.classList.remove('hidden');
}
window.addEventListener('popstate', (e) => {
  if (e.state?.section) showSection(e.state.section);
  else showSection('homepage');
});

function logout() {
  loggedCustomerData = null;
  bookingData = {};
  prenotazioniMap.clear();
  sessionStorage.clear();
  showSection('homepage');
  mostraSuccesso('Logout effettuato');
}

/* ========== LOGIN ========== */
async function handleLogin(cf) {
  if (!cf || cf.length < 11) throw new Error('Inserisci un codice fiscale valido');
  if (!validaCodiceFiscale(cf)) throw new Error('Codice fiscale non valido');
  
  mostraLoading(true);
  try {
    const [dati, prenotazioniRes] = await Promise.all([apiPostDatiCliente(cf), apiPostPrenotazioni(cf)]);
    
    if (!dati || !dati.nome) throw new Error('Nessun cliente trovato');
    
    loggedCustomerData = {
      nome: asString(dati.nome),
      dataNascita: asString(dati.dataNascita),
      luogoNascita: asString(dati.luogoNascita),
      codiceFiscale: cf.toUpperCase(),
      comuneResidenza: asString(dati.comuneResidenza),
      viaResidenza: asString(dati.viaResidenza),
      civicoResidenza: asString(dati.civicoResidenza),
      numeroPatente: asString(dati.numeroPatente),
      dataInizioValiditaPatente: asString(dati.dataInizioValiditaPatente),
      dataFineValiditaPatente: asString(dati.dataFineValiditaPatente),
      cellulare: asString(dati.cellulare)
    };
    
    prenotazioniMap.clear();
    if (Array.isArray(prenotazioniRes.prenotazioni)) {
      prenotazioniRes.prenotazioni.forEach(p => {
        if (p['ID prenotazione']) prenotazioniMap.set(p['ID prenotazione'], p);
      });
    }
    
    sessionStorage.setItem('imbriani_logged_user', JSON.stringify(loggedCustomerData));
    renderAreaPersonale();
    showSection('area-personale');
    mostraSuccesso(`Benvenuto, ${loggedCustomerData.nome}`);
  } catch (err) {
    console.error(err);
    mostraErrore(err.message || 'Errore login');
  } finally {
    mostraLoading(false);
  }
}

function renderAreaPersonale() {
  const root = qs('#area-personale-content');
  if (!root || !loggedCustomerData) return;
  
  clearAndAppend(root,
    el('div', { class: 'card welcome-card' },
      el('h2', { text: `Benvenuto, ${loggedCustomerData.nome}!` }),
      el('p', { text: `CF: ${loggedCustomerData.codiceFiscale}` }),
      el('button', { class: 'btn btn--primary', onclick: startNewBookingWithPreFill }, 'Nuova Prenotazione'),
      el('button', { class: 'btn btn--secondary', onclick: logout }, 'Esci')
    ),
    el('div', { class: 'card prenotazioni-card' },
      el('h3', { text: 'Le tue prenotazioni' }),
      prenotazioniMap.size === 0 
        ? el('p', { text: 'Nessuna prenotazione trovata' })
        : el('div', { class: 'prenotazioni-lista' }, ...renderPrenotazioniLista())
    )
  );
}

function renderPrenotazioniLista() {
  const items = [];
  prenotazioniMap.forEach((p, id) => {
    items.push(
      el('div', { class: 'prenotazione-item card-sm' },
        el('strong', { text: `ID: ${id}` }),
        el('p', { text: `Veicolo: ${asString(p.Targa)} • ${asString(p['Giorno inizio noleggio'])} - ${asString(p['Giorno fine noleggio'])}` }),
        el('button', { class: 'btn btn--sm', onclick: () => modificaPrenotazione(id) }, 'Modifica')
      )
    );
  });
  return items;
}

function startNewBookingWithPreFill() {
  if (!loggedCustomerData) return;
  
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
  
  sessionStorage.setItem('imbriani_booking_draft', JSON.stringify(bookingData));
  showSection('mainbox');
  showStep('step1');
}

async function modificaPrenotazione(idPrenotazione) {
  const p = prenotazioniMap.get(idPrenotazione);
  if (!p) return mostraErrore('Prenotazione non trovata');
  
  const root = qs('#modifica-form-content');
  if (!root) return;
  
  clearAndAppend(root,
    el('h3', { text: `Modifica prenotazione ${idPrenotazione}` }),
    el('form', { id: 'form-modifica', onsubmit: (e) => { e.preventDefault(); handleUpdatePrenotazione(idPrenotazione); } },
      el('label', {}, 'Nome ', el('input', { name: 'Nome', value: asString(p.Nome), required: true })),
      el('label', {}, 'Data di nascita ', el('input', { name: 'Data di nascita', type: 'date', value: convertDateToIso(p['Data di nascita']), required: true })),
      el('label', {}, 'Luogo di nascita ', el('input', { name: 'Luogo di nascita', value: asString(p['Luogo di nascita']), required: true })),
      el('label', {}, 'Codice fiscale ', el('input', { name: 'Codice fiscale', value: asString(p['Codice fiscale']), required: true })),
      
      el('label', {}, 'Comune di residenza ', el('input', { name: 'Comune di residenza', value: asString(p['Comune di residenza']), required: true })),
      el('label', {}, 'Via di residenza ', el('input', { name: 'Via di residenza', value: asString(p['Via di residenza']), required: true })),
      el('label', {}, 'Civico di residenza ', el('input', { name: 'Civico di residenza', value: asString(p['Civico di residenza']), required: true })),
      
      el('label', {}, 'Numero di patente ', el('input', { name: 'Numero di patente', value: asString(p['Numero di patente']), required: true })),
      el('label', {}, 'Data inizio validità patente ', el('input', { name: 'Data inizio validità patente', type: 'date', value: convertDateToIso(p['Data inizio validità patente']), required: true })),
      el('label', {}, 'Scadenza patente ', el('input', { name: 'Scadenza patente', type: 'date', value: convertDateToIso(p['Scadenza patente']), required: true })),
      
      el('label', {}, 'Ora inizio noleggio ', el('input', { name: 'Ora inizio noleggio', type: 'time', value: asString(p['Ora inizio noleggio']), required: true })),
      el('label', {}, 'Ora fine noleggio ', el('input', { name: 'Ora fine noleggio', type: 'time', value: asString(p['Ora fine noleggio']), required: true })),
      el('label', {}, 'Cellulare ', el('input', { name: 'Cellulare', type: 'tel', value: asString(p.Cellulare), required: true })),
      
      el('button', { type: 'submit', class: 'btn btn--primary' }, 'Salva Modifiche'),
      el('button', { type: 'button', class: 'btn btn--danger', onclick: () => handleDeletePrenotazione(idPrenotazione) }, 'Elimina')
    )
  );
  
  showSection('modifica-prenotazione');
}

async function handleUpdatePrenotazione(idPrenotazione) {
  const form = qs('#form-modifica');
  if (!form) return;
  
  const data = {};
  qsa('input', form).forEach(inp => data[inp.name] = inp.value);
  
  mostraLoading(true);
  try {
    const res = await apiManageBooking({ action: 'update', idPrenotazione, ...data });
    if (!res.success) throw new Error(res.error || 'Errore aggiornamento');
    
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
  if (!confirm('Confermi l'eliminazione?')) return;
  
  mostraLoading(true);
  try {
    const res = await apiManageBooking({ action: 'delete', idPrenotazione });
    if (!res.success) throw new Error(res.error || 'Errore eliminazione');
    
    mostraSuccesso('Prenotazione eliminata');
    await handleLogin(loggedCustomerData.codiceFiscale);
  } catch (err) {
    console.error(err);
    mostraErrore(err.message || 'Errore eliminazione');
  } finally {
    mostraLoading(false);
  }
}
/* ========== STEP 1 — Date/Orari ========== */
async function controllaDisponibilita() {
  const dataR = getDateFromSelects('giorno_ritiro', 'mese_ritiro', 'anno_ritiro');
  const dataA = getDateFromSelects('giorno_arrivo', 'mese_arrivo', 'anno_arrivo');
  const oraR = qs('#ora_partenza')?.value || '';
  const oraA = qs('#ora_arrivo')?.value || '';
  
  if (!dataR || !dataA) return mostraErrore('Compila le date');
  if (new Date(dataR) > new Date(dataA)) return mostraErrore('Data fine precedente a data inizio');
  
  bookingData.dataRitiro = dataR;
  bookingData.dataArrivo = dataA;
  bookingData.oraRitiro = oraR;
  bookingData.oraArrivo = oraA;
  sessionStorage.setItem('imbriani_booking_draft', JSON.stringify(bookingData));
  
  mostraLoading(true);
  try {
    const res = await apiPostDisponibilita({ dataRitiro: dataR, dataArrivo: dataA, oraRitiro: oraR, oraArrivo: oraA });
    const vehicles = Array.isArray(res.vehicles) && res.vehicles.length ? res.vehicles : pulmini;
    
    renderPulminiCards(vehicles);
    showStep('step2');
  } catch (err) {
    console.error(err);
    mostraErrore('Errore verifica disponibilità, uso catalogo base');
    renderPulminiCards(pulmini);
    showStep('step2');
  } finally {
    mostraLoading(false);
  }
}

/* ========== STEP 2 — Card veicoli ========== */
function renderPulminiCards(vehicles) {
  const root = qs('#lista-pulmini');
  if (!root) return;
  
  clearAndAppend(root, ...vehicles.map(v =>
    el('div', { class: 'card-pulmino', dataset: { id: v.id, targa: v.targa || '' }, onclick: () => selectPulmino(v) },
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
  if (!bookingData.pulmino || !bookingData.pulmino.id) return mostraErrore('Seleziona un veicolo');
  mostraModuliAutisti();
  showStep('step3');
}

/* ========== STEP 3 — Autisti con residenza ========== */
function mostraModuliAutisti() {
  const root = qs('#autisti-container');
  if (!root) return;
  
  const numAutisti = bookingData.autisti?.length || 1;
  clearAndAppend(root, ...Array.from({ length: numAutisti }, (_, i) => buildAutistaForm(i + 1, bookingData.autisti?.[i] || {})));
  
  const selectNum = qs('#numero-autisti');
  if (selectNum) {
    selectNum.value = numAutisti;
    selectNum.onchange = (e) => {
      const n = Math.min(3, Math.max(1, parseInt(e.target.value, 10) || 1));
      bookingData.autisti = Array.from({ length: n }, (_, i) => bookingData.autisti?.[i] || {});
      mostraModuliAutisti();
    };
  }
}

function buildAutistaForm(index, prefill = {}) {
  return el('div', { class: 'card form-autista', dataset: { index } },
    el('h4', { text: `Autista ${index}` }),
    el('label', {}, 'Nome e Cognome ', el('input', { id: `nome_${index}`, value: asString(prefill.nomeCognome), required: true })),
    el('label', {}, 'Data di nascita ', el('input', { id: `data_${index}`, type: 'date', value: asString(prefill.dataNascita), required: true })),
    el('label', {}, 'Luogo di nascita ', el('input', { id: `luogo_${index}`, value: asString(prefill.luogoNascita), required: true })),
    el('label', {}, 'Codice fiscale ', el('input', { id: `cf_${index}`, value: asString(prefill.codiceFiscale), required: true })),
    
    el('label', {}, 'Comune di residenza ', el('input', { id: `comune_residenza_${index}`, value: asString(prefill.comuneResidenza), required: true })),
    el('label', {}, 'Via di residenza ', el('input', { id: `via_residenza_${index}`, value: asString(prefill.viaResidenza), required: true })),
    el('label', {}, 'Civico di residenza ', el('input', { id: `civico_residenza_${index}`, value: asString(prefill.civicoResidenza), required: true })),
    
    el('label', {}, 'Numero di patente ', el('input', { id: `patente_${index}`, value: asString(prefill.numeroPatente), required: true })),
    el('label', {}, 'Data inizio validità patente ', el('input', { id: `inizio_pat_${index}`, type: 'date', value: asString(prefill.dataInizioValiditaPatente), required: true })),
    el('label', {}, 'Scadenza patente ', el('input', { id: `fine_pat_${index}`, type: 'date', value: asString(prefill.dataFineValiditaPatente), required: true }))
  );
}

function getAutistaFromForm(index) {
  return {
    nomeCognome: qs(`#nome_${index}`)?.value.trim() || '',
    dataNascita: qs(`#data_${index}`)?.value || '',
    luogoNascita: qs(`#luogo_${index}`)?.value.trim() || '',
    codiceFiscale: qs(`#cf_${index}`)?.value.trim().toUpperCase() || '',
    comuneResidenza: qs(`#comune_residenza_${index}`)?.value.trim() || '',
    viaResidenza: qs(`#via_residenza_${index}`)?.value.trim() || '',
    civicoResidenza: qs(`#civico_residenza_${index}`)?.value.trim() || '',
    numeroPatente: qs(`#patente_${index}`)?.value.trim() || '',
    dataInizioValiditaPatente: qs(`#inizio_pat_${index}`)?.value || '',
    dataFineValiditaPatente: qs(`#fine_pat_${index}`)?.value || ''
  };
}

function continuaStep3() {
  const n = bookingData.autisti?.length || 1;
  bookingData.autisti = Array.from({ length: n }, (_, i) => getAutistaFromForm(i + 1));
  
  const a1 = bookingData.autisti[0];
  if (!a1.nomeCognome || !a1.codiceFiscale) return mostraErrore('Compila i dati obbligatori autista 1');
  if (!validaCodiceFiscale(a1.codiceFiscale)) return mostraErrore('Codice fiscale autista 1 non valido');
  if (!a1.comuneResidenza || !a1.viaResidenza) return mostraErrore('Compila residenza autista 1');
  
  sanitizeBookingResidence(bookingData);
  
  bookingData.cellulare = qs('#cellulare')?.value.trim() || loggedCustomerData?.cellulare || '';
  if (!bookingData.cellulare) return mostraErrore('Inserisci un numero di cellulare');
  if (!validaTelefono(bookingData.cellulare)) return mostraErrore('Numero di cellulare non valido');
  
  sessionStorage.setItem('imbriani_booking_draft', JSON.stringify(bookingData));
  mostraRiepilogo();
  showStep('step4');
}

/* ========== STEP 4 — Riepilogo ========== */
function mostraRiepilogo() {
  const root = qs('#riepilogo-content');
  if (!root) return;
  
  const a1 = bookingData.autisti[0] || {};
  clearAndAppend(root,
    el('div', { class: 'card' },
      el('h3', { text: 'Veicolo' }),
      el('p', { text: `${bookingData.pulmino?.nome || '-'} (Targa: ${bookingData.pulmino?.targa || '-'})` }),
      
      el('h3', { text: 'Periodo' }),
      el('p', { text: `${bookingData.dataRitiro} ${bookingData.oraRitiro} → ${bookingData.dataArrivo} ${bookingData.oraArrivo}` }),
      
      el('h3', { text: 'Autista 1' }),
      el('p', { text: `${a1.nomeCognome || '-'}` }),
      el('p', { text: `Nascita: ${a1.dataNascita || '-'} • ${a1.luogoNascita || '-'}` }),
      el('p', { text: `CF: ${a1.codiceFiscale || '-'}` }),
      el('p', { text: `Residenza: ${a1.viaResidenza || '-'} ${a1.civicoResidenza || ''}, ${a1.comuneResidenza || '-'}` }),
      el('p', { text: `Patente: ${a1.numeroPatente || '-'} (${a1.dataInizioValiditaPatente || '-'} → ${a1.dataFineValiditaPatente || '-'})` }),
      
      el('h3', { text: 'Contatto' }),
      el('p', { text: `Cellulare: ${bookingData.cellulare || '-'}` })
    )
  );
}

async function inviaPrenotazione() {
  mostraLoading(true);
  try {
    const payload = { action: 'create', prenotazione: bookingData };
    const res = await apiManageBooking(payload);
    if (!res.success) throw new Error(res.error || 'Errore invio');
    
    mostraSuccesso('Prenotazione inviata con successo!');
    sessionStorage.removeItem('imbriani_booking_draft');
    bookingData = {};
    
    if (loggedCustomerData) {
      await handleLogin(loggedCustomerData.codiceFiscale);
    } else {
      showSection('homepage');
    }
  } catch (err) {
    console.error(err);
    mostraErrore(err.message || 'Errore durante l'invio');
  } finally {
    mostraLoading(false);
  }
}
/* ========== NAVIGATION & BACK ========== */
function setupNavigation() {
  const title = qs('#site-title');
  if (title) title.onclick = (e) => { e.preventDefault(); showSection('homepage'); };
  
  qsa('.btn-back').forEach(btn => {
    btn.onclick = () => {
      const target = btn.getAttribute('data-target');
      if (target) showStep(target);
      else history.back();
    };
  });
}

/* ========== FORM HANDLERS ========== */
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
  if (btnNew) btnNew.onclick = () => {
    bookingData = { pulmino: null, targa: '', autisti: [{}], cellulare: '' };
    showSection('mainbox');
    showStep('step1');
  };
}

function setupStep1() {
  const btn = qs('#btn-controlla-disponibilita');
  if (btn) btn.onclick = controllaDisponibilita;
  
  popolaSelectDate();
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

/* ========== SESSION RESTORE ========== */
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

/* ========== INIT APP ========== */
function initApp() {
  console.log('Inizializzazione app Imbriani Noleggio v5.2.0...');
  
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
    showSection('homepage');
  }
  
  window.addEventListener('popstate', (e) => {
    if (e.state?.section) showSection(e.state.section);
    else showSection('homepage');
  });
  
  console.log('App pronta! ✅');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

window.ImbrianiApp = {
  showSection,
  showStep,
  handleLogin,
  logout,
  mostraErrore,
  mostraSuccesso,
  bookingData: () => bookingData,
  loggedUser: () => loggedCustomerData
};
