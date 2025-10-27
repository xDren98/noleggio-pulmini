/* Imbriani Noleggio – scripts.js (refactor sicuro + requisiti funzionali)
   Versione 3.3.0
   - DOM sicuro (niente handler inline, niente innerHTML con dati dinamici)
   - Nuova prenotazione post-login con precompilazione autista 1 + cellulare
   - Fino a 3 autisti e preservazione dei dati al cambio numero
   - Fasce orarie fisse lette da select (08:00, 12:00, 16:00, 20:00)
   - Anni “fine validità patente” estesi (fino a annoCorrente + 20)
   - Passaggio corretto a Step 4 (riepilogo)
*/
'use strict';

/* =========================
   CONFIG E COSTANTI
========================= */
console.log('Imbriani Noleggio - Versione codice: 3.3.1');

const pulmini = [
  { id: 'ducato_lungo', nome: 'Fiat Ducato (Passo lungo)', targa: 'EC787NM' },
  { id: 'ducato_corto', nome: 'Fiat Ducato (Passo corto)', targa: 'DN391FW' },
  { id: 'peugeot', nome: 'Peugeot Expert Tepee', targa: 'DL291XZ' }
];

let loggedCustomerData = null;
let bookingData = {};
const prenotazioniMap = new Map(); // id -> oggetto prenotazione

const SCRIPTS = {
  proxy: 'https://proxy-cors-google-apps.onrender.com/',
  datiCliente: 'https://script.google.com/macros/s/AKfycbxnC-JSK4YXvV8GF6ED9uK3SSNYs3uAFAmyji6KB_eQ60QAqXIHbTM-18F7-Zu47bo/exec',
  disponibilita: 'https://script.google.com/macros/s/AKfycbwhEK3IH-hLGYpGXHRjcYdUaW2e3He485XpgcRVr0GBSyE4v4-gSCp5vnSCbn5ocNI/exec',
  prenotazioni: 'https://script.google.com/macros/s/AKfycbyMPuvESaAJ7bIraipTya9yUKnyV8eYbm-r8CX42KRvDQsX0f44QBsaqQOY8KVYFBE/exec',
  manageBooking: 'https://script.google.com/macros/s/AKfycbxAKX12Sgc0ODvGtUEXCRoINheSeO9-SgDNGuY1QtrVKBENdY0SpMiDtzgoxIBRCuQ/exec'
};

/* =========================
   UTILITY DOM SICURE
========================= */
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = String(v);
    else if (k === 'html') node.innerHTML = String(v); // solo frammenti statici
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
function asString(x, fb = 'ND') { return x == null ? fb : String(x); }
function pad2(n) { return String(n).padStart(2, '0'); }

// === Utility residenza e veicolo ===
function sanitizeStreet(s) {
  return String(s || '').replace(/^\s*(via|viale|v\.|p\.?zza|piazza)\s+/i, '');
}
function sanitizeBookingResidence(b) {
  if (!b || !Array.isArray(b.autisti)) return;
  b.autisti = b.autisti.map(a => ({ ...a, viaResidenza: sanitizeStreet(a.viaResidenza) }));
}
function getPulminoById(id){
  const p = pulmini.find(x => x.id === id);
  return p ? { id: p.id, nome: p.nome, targa: p.targa || '' } : { id, nome: '', targa: '' };
}

/* =========================
   VALIDAZIONI E FORMAT
========================= */
function validaCodiceFiscale(cf) {
  const regex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
  return regex.test(String(cf || '').toUpperCase());
}
function validaTelefono(tel) {
  return /^[0-9]{9,15}$/.test(String(tel || '').replace(/\s+/g, ''));
}
function convertDateToIso(ddmmyyyy) {
  if (!ddmmyyyy || !/^\d{2}\/\d{2}\/\d{4}$/.test(ddmmyyyy)) return '';
  const [dd, mm, yyyy] = ddmmyyyy.split('/');
  return `${yyyy}-${mm}-${dd}`;
}

/* =========================
   BANNER & LOADER
========================= */
function mostraErrore(msg) {
  if (document.querySelector('.error-banner')) return;
  const div = el('div', { class: 'error-banner', role: 'status', 'aria-live': 'polite' },
    el('span', { class: 'banner-ico', 'aria-hidden': 'true', text: '⚠️' }),
    el('span', { class: 'banner-msg', text: asString(msg) })
  );
  document.body.prepend(div);
  setTimeout(() => div.remove(), 4500);
}
function mostraSuccesso(msg) {
  if (document.querySelector('.success-banner')) return;
  const div = el('div', { class: 'success-banner', role: 'status', 'aria-live': 'polite' },
    el('span', { class: 'banner-ico', 'aria-hidden': 'true', text: '✅' }),
    el('span', { class: 'banner-msg', text: asString(msg) })
  );
  document.body.prepend(div);
  setTimeout(() => div.remove(), 3200);
}
function mostraLoading(show = true) {
  let overlay = document.getElementById('globalLoader');
  if (show) {
    if (!overlay) {
      overlay = el('div', { id: 'globalLoader', class: 'loader-overlay', role: 'alert', 'aria-live': 'assertive' },
        el('div', { class: 'loader-spinner' },
          el('div', { class: 'spinner', 'aria-hidden': 'true' }),
          el('p', { class: 'loader-text', text: 'Caricamento in corso…' })
        )
      );
      document.body.append(overlay);
    }
    overlay.style.display = 'flex';
  } else if (overlay) {
    overlay.style.display = 'none';
  }
}

/* =========================
   FETCH / API
========================= */
function fetchWithProxy(url, options = {}) { return fetch(SCRIPTS.proxy + url, options); }
function withTimeout(promise, ms = 15000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(v => { clearTimeout(t); resolve(v); })
           .catch(e => { clearTimeout(t); reject(e); });
  });
}
async function fetchJSON(url, options = {}) {
  const res = await withTimeout(fetchWithProxy(url, options), options.timeout || 15000);
  if (!res.ok) throw new Error(`http_${res.status}`);
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  if (ct.includes('application/json')) return res.json();
  try { return await res.json(); } catch { return {}; }
}
// Manteniamo POST come nel codice originale
async function apiPostPrenotazioni(cf) {
  return fetchJSON(SCRIPTS.prenotazioni, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cf })
  });
}
async function apiPostDatiCliente(cf) {
  return fetchJSON(SCRIPTS.datiCliente, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cf })
  });
}
async function apiPostDisponibilita(payload) {
  return fetchJSON(SCRIPTS.disponibilita, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload || {})
  });
}
async function apiManageBooking(payload) {
  return fetchJSON(SCRIPTS.manageBooking, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload || {})
  });
}

/* =========================
   HELPERS DATE UI
========================= */
function getData(prefix) {
  const gg = qs(`#giorno_${prefix}`)?.value || '';
  const mm = qs(`#mese_${prefix}`)?.value || '';
  const aa = qs(`#anno_${prefix}`)?.value || '';
  if (!gg || !mm || !aa) return '';
  return `${gg}/${mm}/${aa}`;
}
function getDataAutista(tipo, i) {
  const gg = qs(`#giorno_${tipo}_${i}`)?.value || '';
  const mm = qs(`#mese_${tipo}_${i}`)?.value || '';
  const aa = qs(`#anno_${tipo}_${i}`)?.value || '';
  if (!gg || !mm || !aa) return '';
  return `${gg}/${mm}/${aa}`;
}
function popolaTendineData(giornoId, meseId, annoId, annoStart, annoEnd) {
  const selG = document.getElementById(giornoId);
  const selM = document.getElementById(meseId);
  const selA = document.getElementById(annoId);
  if (!selG || !selM || !selA) return;
  selG.innerHTML = '';
  selG.append(el('option', { value: '', text: 'GG' }));
  for (let i = 1; i <= 31; i++) selG.append(el('option', { value: pad2(i), text: String(i) }));
  selM.innerHTML = '';
  selM.append(el('option', { value: '', text: 'MM' }));
  for (let i = 1; i <= 12; i++) selM.append(el('option', { value: pad2(i), text: String(i) }));
  selA.innerHTML = '';
  selA.append(el('option', { value: '', text: 'AAAA' }));
  for (let y = annoEnd; y >= annoStart; y--) selA.append(el('option', { value: String(y), text: String(y) }));
}

/* =========================
   RENDER SICURO: DATI & PRENOTAZIONI
========================= */
function renderDatiCliente(dati) {
  const container = document.getElementById('contenutoPersonale');
  if (!container) return;
  if (!dati) return clearAndAppend(container, el('p', { text: 'Dati cliente non disponibili.' }));
  const blocco = el('div', { class: 'card' },
    el('h3', { text: 'I tuoi dati' }),
    el('p', {}, el('strong', { text: 'Nome e Cognome: ' }), el('span', { text: asString(dati.nomeCognome) })),
    el('p', {}, el('strong', { text: 'Data di Nascita: ' }), el('span', { text: asString(dati.dataNascita) })),
    el('p', {}, el('strong', { text: 'Codice Fiscale: ' }), el('span', { text: asString(dati.codiceFiscale) })),
    el('p', {}, el('strong', { text: 'Numero Patente: ' }), el('span', { text: asString(dati.numeroPatente) })),
    el('p', {}, el('strong', { text: 'Validità Patente: ' }), el('span', { text: `${asString(dati.dataInizioValiditaPatente)} - ${asString(dati.dataFineValiditaPatente)}` })),
    el('p', {}, el('strong', { text: 'Cellulare: ' }), el('span', { text: asString(dati.cellulare) }))
  );
  clearAndAppend(container, blocco);
}
function renderPrenotazioni(prenotazioni) {
  const container = document.getElementById('contenutoPersonale');
  if (!container) return;
  if (!Array.isArray(prenotazioni) || !prenotazioni.length) {
    return clearAndAppend(container, el('p', { text: 'Nessuna prenotazione trovata.' }));
  }
  const wrap = el('div', { class: 'prenotazioni-container' }, el('h3', { text: 'Le tue prenotazioni' }));
  prenotazioniMap.clear();
  for (const p of prenotazioni) {
    const id = asString(p['ID prenotazione'] || p.id || '');
    prenotazioniMap.set(id, p);
    const header = el('div', { class: 'prenotazione-header' },
      el('span', { class: 'material-icons', 'aria-hidden': 'true', text: 'directions_bus' }),
      el('strong', { text: asString(p.Nome || p.nomeCognome || 'Cliente') })
    );
    const dateBox = el('div', { class: 'prenotazione-date' },
      el('div', { class: 'date-item' }, el('span', { class: 'material-icons', 'aria-hidden': 'true', text: 'event' }), el('span', { text: `Dal: ${asString(p['Giorno inizio noleggio'] || 'ND')}` })),
      el('div', { class: 'date-item' }, el('span', { class: 'material-icons', 'aria-hidden': 'true', text: 'event_available' }), el('span', { text: `Al: ${asString(p['Giorno fine noleggio'] || 'ND')}` }))
    );
    const statoText = asString(p.stato || 'In corso');
    const statoClass = /completat/i.test(statoText) ? 'status--success' : (/annullat|cancellat/i.test(statoText) ? 'status--warning' : 'status--info');
    const stato = el('div', { class: 'prenotazione-stato' }, el('span', { class: `status ${statoClass}`, text: statoText }));
    const actions = el('div', { class: 'actions' },
      el('button', { class: 'btn btn--secondary', dataset: { id }, text: 'Modifica', onclick: () => modificaPrenotazione(prenotazioniMap.get(id)) }),
      el('button', { class: 'btn btn--danger', dataset: { id }, text: 'Cancella', onclick: () => cancellaPrenotazione({ 'ID prenotazione': id }) })
    );
    const card = el('div', { class: 'prenotazione-card', dataset: { id } }, header, dateBox, stato, actions);
    wrap.append(card);
  }
  clearAndAppend(container, wrap);
}
/* =========================
   ROUTING CON HISTORY API
========================= */
function routeTo(view, stepId) {
  const home = document.getElementById('homepage');
  const area = document.getElementById('areaPersonale');
  const main = document.getElementById('mainbox');

  if (view === 'home') {
    if (home) home.style.display = 'block';
    if (area) area.style.display = 'none';
    if (main) main.style.display = 'none';
  } else if (view === 'area') {
    if (home) home.style.display = 'none';
    if (area) area.style.display = 'block';
    if (main) main.style.display = 'none';
  } else if (view === 'wizard') {
    if (home) home.style.display = 'none';
    if (area) area.style.display = 'none';
    if (main) main.style.display = 'flex';
    if (stepId) showStep(stepId, { skipPush: true });
  }
}

function initHistory() {
  const hash = (location.hash || '').replace('#', '');
  if (!history.state) {
    if (hash === 'area') history.replaceState({ view: 'area' }, '', '#area');
    else if (/^step[1-4]$/.test(hash)) history.replaceState({ view: 'wizard', step: hash }, '', '#' + hash);
    else history.replaceState({ view: 'home' }, '', '#home');
  }
  const st = history.state || { view: 'home' };
  routeTo(st.view, st.step);

  window.addEventListener('popstate', (ev) => {
    const state = ev.state || { view: 'home' };
    routeTo(state.view, state.step);
  });
}

/* =========================
   LOGIN E AREA PERSONALE
========================= */
function setupAreaPersonale() {
  const btnPren = document.getElementById('btnVisualizzaPrenotazioni');
  const btnDati = document.getElementById('btnVisualizzaDati');
  const btnLogout = document.getElementById('btnLogout');
  const btnNewBookingAP = document.getElementById('btnNewBookingAP');

  if (btnPren) btnPren.addEventListener('click', () => { if (loggedCustomerData?.cf) caricaPrenotazioniCliente(loggedCustomerData.cf); });
  if (btnDati) btnDati.addEventListener('click', () => { renderDatiCliente(loggedCustomerData?.datiCompleti || null); });
  if (btnLogout) btnLogout.addEventListener('click', () => {
    loggedCustomerData = null;
routeTo('area');
history.pushState({ view: 'area' }, '', '#area');
    const cont = document.getElementById('contenutoPersonale'); if (cont) cont.innerHTML = '';
  });
  if (btnNewBookingAP) btnNewBookingAP.addEventListener('click', () => startNewBookingWithPreFill());
}
async function handleLoginSubmit(ev) {
  ev.preventDefault();
  const cfInput = document.getElementById('cfInputHomepage');
  const cf = String(cfInput?.value || '').trim().toUpperCase();
  const loginResult = document.getElementById('loginResultHomepage');
  if (loginResult) loginResult.textContent = '';
  if (!validaCodiceFiscale(cf)) return mostraErrore('Codice fiscale non valido.');
  try {
    mostraLoading(true);
    const [resultPren, resultCliente] = await Promise.all([apiPostPrenotazioni(cf), apiPostDatiCliente(cf)]);
    if (!resultPren?.success || !Array.isArray(resultPren?.prenotazioni)) {
      // Anche se zero prenotazioni, consenti comunque di andare in area per avviare una nuova
      console.warn('Nessuna prenotazione trovata per il CF.');
    }
    loggedCustomerData = { cf, datiCompleti: resultCliente?.success ? resultCliente.cliente : null };
    setupAreaPersonale();
    // Mostra area personale e nasconde home
    const area = document.getElementById('areaPersonale'); if (area) area.style.display = 'block';
    const home = document.getElementById('homepage'); if (home) home.style.display = 'none';
    // Carica prenotazioni in background
    if (cf) caricaPrenotazioniCliente(cf);
    mostraSuccesso('Accesso completato. Ora puoi creare una nuova prenotazione.');
  } catch (e) {
    console.error(e);
    mostraErrore('Errore durante l’accesso.');
  } finally {
    mostraLoading(false);
  }
}

/* =========================
   CARICAMENTO PRENOTAZIONI E DATI
========================= */
async function caricaPrenotazioniCliente(cf) {
  try {
    mostraLoading(true);
    const data = await apiPostPrenotazioni(cf);
    if (!data?.success) {
      const cont = document.getElementById('contenutoPersonale'); if (cont) cont.innerHTML = '';
      return mostraErrore(`Errore nel recupero prenotazioni${data?.error ? ': ' + data.error : ''}`);
    }
    const list = Array.isArray(data.prenotazioni) ? data.prenotazioni : [];
    renderPrenotazioni(list);
  } catch (e) {
    console.error(e);
    const cont = document.getElementById('contenutoPersonale'); if (cont) cont.innerHTML = '';
    mostraErrore('Errore caricamento prenotazioni.');
  } finally {
    mostraLoading(false);
  }
}

/* =========================
   MODIFICA / CANCELLAZIONE PRENOTAZIONE
========================= */
function modificaPrenotazione(p) {
  try { if (typeof p === 'string') p = JSON.parse(p); } catch {}
  const cont = document.getElementById('contenutoPersonale');
  if (!cont) return;
  const form = el('form', { id: 'formModificaPrenotazione', class: 'card' },
    el('h3', { text: 'Modifica prenotazione' }),
    el('label', {}, el('span', { text: 'Nome ' }), el('input', { type: 'text', name: 'Nome', value: asString(p.Nome || p.nomeCognome || ''), required: 'true' })),
    el('label', {}, el('span', { text: 'Data di nascita ' }), el('input', { type: 'text', name: 'Data di nascita', value: asString(p['Data di nascita'] || ''), required: 'true' })),
    el('label', {}, el('span', { text: 'Luogo di nascita ' }), el('input', { type: 'text', name: 'Luogo di nascita', value: asString(p['Luogo di nascita'] || ''), required: 'true' })),
    el('label', {}, el('span', { text: 'Comune di residenza ' }), el('input', { type: 'text', name: 'Comune di residenza', value: asString(p['Comune di residenza'] || ''), required: 'true' })),
    el('label', {}, el('span', { text: 'Via di residenza ' }), el('input', { type: 'text', name: 'Via di residenza', value: asString(p['Via di residenza'] || ''), required: 'true' })),
    el('label', {}, el('span', { text: 'Civico di residenza ' }), el('input', { type: 'text', name: 'Civico di residenza', value: asString(p['Civico di residenza'] || ''), required: 'true' })),
    el('label', {}, el('span', { text: 'Numero di patente ' }), el('input', { type: 'text', name: 'Numero di patente', value: asString(p['Numero di patente'] || ''), required: 'true' })),
    el('label', {}, el('span', { text: 'Data inizio validità patente ' }), el('input', { type: 'text', name: 'Data inizio validità patente', value: asString(p['Data inizio validità patente'] || ''), required: 'true' })),
    el('label', {}, el('span', { text: 'Scadenza patente ' }), el('input', { type: 'text', name: 'Scadenza patente', value: asString(p['Scadenza patente'] || ''), required: 'true' })),
    el('label', {}, el('span', { text: 'Ora inizio noleggio ' }), el('input', { type: 'text', name: 'Ora inizio noleggio', value: asString(p['Ora inizio noleggio'] || ''), required: 'true' })),
    el('label', {}, el('span', { text: 'Ora fine noleggio ' }), el('input', { type: 'text', name: 'Ora fine noleggio', value: asString(p['Ora fine noleggio'] || ''), required: 'true' })),
    el('input', { type: 'hidden', name: 'idPrenotazione', value: asString(p['ID prenotazione'] || '') }),
    el('div', { class: 'actions' },
      el('button', { type: 'submit', class: 'btn btn--primary', text: 'Aggiorna' }),
      el('button', { type: 'button', class: 'btn', text: 'Annulla', onclick: () => caricaPrenotazioniCliente(loggedCustomerData?.cf) })
    )
  );
  clearAndAppend(cont, form);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {};
    new FormData(form).forEach((v, k) => data[k] = v);
    try {
      if (data['Via di residenza'] !== undefined) data['Via di residenza'] = sanitizeStreet(data['Via di residenza']);
      mostraLoading(true);
      const msg = await apiManageBooking(data);
      if (msg?.success) {
        mostraSuccesso(msg?.message || 'Prenotazione aggiornata');
        caricaPrenotazioniCliente(loggedCustomerData?.cf);
      } else {
        mostraErrore(msg?.error || 'Aggiornamento fallito');
      }
    } catch (err) {
      console.error(err);
      mostraErrore('Errore aggiornamento prenotazione.');
    } finally {
      mostraLoading(false);
    }
  });
}
async function cancellaPrenotazione(p) {
  try { if (typeof p === 'string') p = JSON.parse(p); } catch {}
  const idPrenotazione = p?.['ID prenotazione'];
  if (!idPrenotazione) return mostraErrore('ID prenotazione mancante');
  if (!confirm('Sei sicuro di voler cancellare questa prenotazione?')) return;
  try {
    mostraLoading(true);
    const result = await apiManageBooking({ idPrenotazione, delete: true });
    if (result?.success) {
      mostraSuccesso(result?.message || 'Prenotazione cancellata');
      caricaPrenotazioniCliente(loggedCustomerData?.cf);
    } else {
      mostraErrore(result?.error || 'Cancellazione fallita');
    }
  } catch (e) {
    console.error(e);
    mostraErrore('Errore cancellazione.');
  } finally {
    mostraLoading(false);
  }
}

/* =========================
   WIZARD: STEP 1 -> 4
========================= */
function showStep(stepId, opts = {}) {
  qsa('.step').forEach(s => s.classList.remove('active'));
  const step = document.getElementById(stepId);
  if (step) step.classList.add('active');
  updateBackButton();
  if (!opts.skipPush) {
    history.pushState({ view: 'wizard', step: stepId }, '', '#' + stepId);
  }
}

function updateBackButton() {
  let backBtn = document.getElementById('backBtn');
  if (!backBtn) {
    backBtn = el('button', { id: 'backBtn', class: 'btn-back', onclick: goBack },
      el('span', { class: 'material-icons', text: 'arrow_back' }), document.createTextNode(' Indietro')
    );
    const mainbox = document.getElementById('mainbox');
    if (mainbox) mainbox.insertBefore(backBtn, mainbox.firstChild);
  }
  backBtn.style.display = 'flex';
}
function goBack() {
  history.back();
}


/* Step 1: controlla disponibilità */
async function controllaDisponibilita() {
  const dataRitiroStr = getData('ritiro');
  const oraRitiro = document.getElementById('ora_partenza')?.value || '';
  const dataArrivoStr = getData('arrivo');
  const oraArrivo = document.getElementById('ora_arrivo')?.value || '';

  if (!dataRitiroStr || !oraRitiro || !dataArrivoStr || !oraArrivo) return mostraErrore('Inserisci data e ora validi per ritiro e arrivo.');

  const dR = new Date(`${dataRitiroStr.split('/')[2]}-${dataRitiroStr.split('/')[1]}-${dataRitiroStr.split('/')[0]}T${oraRitiro}`);
  const dA = new Date(`${dataArrivoStr.split('/')[2]}-${dataArrivoStr.split('/')[1]}-${dataArrivoStr.split('/')[0]}T${oraArrivo}`);
  if (dR >= dA) return mostraErrore('La data/ora di arrivo deve essere successiva a quella di ritiro.');

  // Salva in stato
  bookingData.dataRitiro = dataRitiroStr;
  bookingData.oraRitiro = oraRitiro;
  bookingData.dataArrivo = dataArrivoStr;
  bookingData.oraArrivo = oraArrivo;

  try {
    mostraLoading(true);
    // Manteniamo il payload originale
    const data = await apiPostDisponibilita({ action: 'getPrenotazioni' });
    if (!data?.success) return mostraErrore(`Errore nel recupero delle prenotazioni${data?.error ? ': ' + data.error : ''}`);

    const arrayPrenotazioni = data.prenotazioni || [];
    const disponibili = pulmini.filter(p =>
      !arrayPrenotazioni.some(pren => {
        if (pren.targa !== p.targa) return false;
        const inizio = new Date(pren.inizio);
        const fine = new Date(pren.fine);
        return !(fine <= dR || inizio >= dA);
      })
    );

    const select = document.getElementById('scelta_pulmino');
    const nDisp = document.getElementById('num_disponibili');
    if (nDisp) nDisp.textContent = String(disponibili.length);
    if (select) {
      select.innerHTML = '';
      select.append(el('option', { value: '', text: '-- Seleziona un pulmino --' }));
      for (const p of disponibili) select.append(el('option', { value: p.id, text: p.nome }));
    }
    if (!disponibili.length) return mostraErrore('Nessun pulmino disponibile per la fascia selezionata!');

    mostraSuccesso(`Trovati ${disponibili.length} pulmini disponibili!`);
    showStep('step2');
    const continuaBtn = document.getElementById('chiamaContinuaBtn');
    if (continuaBtn) continuaBtn.disabled = true;
    if (select) select.addEventListener('change', function () {
      if (continuaBtn) continuaBtn.disabled = !this.value;
      if (this.value) bookingData.pulmino = pulmini.find(p => p.id === this.value) || null;
    }, { once: true });
  } catch (e) {
    console.error(e);
    mostraErrore('Errore durante il controllo disponibilità.');
  } finally {
    mostraLoading(false);
  }
}

/* Step 2 -> 3 */
function vaiStep3() { showStep('step3'); mostraModuliAutisti(); }

/* Step 3: utilities per preservare dati */
function getAutistaFromForm(i) {
  return {
    nomeCognome: document.getElementById(`nome_cognome_${i}`)?.value?.trim() || '',
    dataNascita: getDataAutista('nascita', i) || '',
    luogoNascita: document.getElementById(`luogo_nascita_${i}`)?.value?.trim() || '',
    comuneResidenza: document.getElementById(`comune_residenza_${i}`)?.value?.trim() || '',
    viaResidenza: sanitizeStreet(document.getElementById(`via_residenza_${i}`)?.value?.trim() || ''),
    civicoResidenza: document.getElementById(`civico_residenza_${i}`)?.value?.trim() || '',
    codiceFiscale: document.getElementById(`codice_fiscale_${i}`)?.value?.trim().toUpperCase() || '',
    numeroPatente: document.getElementById(`numero_patente_${i}`)?.value?.trim() || '',
    dataInizioValiditaPatente: getDataAutista('inizio_validita_patente', i) || '',
    dataFineValiditaPatente: getDataAutista('fine_validita_patente', i) || ''
  };
}
function saveAutistiFromForm(maxCount) {
  const out = [];
  for (let i = 1; i <= maxCount; i++) {
    const elAny = document.getElementById(`nome_cognome_${i}`);
    if (elAny) out.push(getAutistaFromForm(i));
  }
  return out;
}
function setSelectValue(id, val) {
  const s = document.getElementById(id);
  if (s && val) s.value = val;
}
function fillAutistaToForm(i, a) {
  if (!a) return;
  const nome = document.getElementById(`nome_cognome_${i}`); if (nome) nome.value = a.nomeCognome || '';
  const ln = document.getElementById(`luogo_nascita_${i}`); if (ln) ln.value = a.luogoNascita || '';
  const cr = document.getElementById(`comune_residenza_${i}`); if (cr) cr.value = a.comuneResidenza || '';
  const vr = document.getElementById(`via_residenza_${i}`); if (vr) vr.value = a.viaResidenza || '';
  const cv = document.getElementById(`civico_residenza_${i}`); if (cv) cv.value = a.civicoResidenza || '';
  const cf = document.getElementById(`codice_fiscale_${i}`); if (cf) cf.value = a.codiceFiscale || '';
  const np = document.getElementById(`numero_patente_${i}`); if (np) np.value = a.numeroPatente || '';
  if (a.dataNascita) {
    const [gg, mm, aa] = a.dataNascita.split('/');
    setSelectValue(`giorno_nascita_${i}`, gg);
    setSelectValue(`mese_nascita_${i}`, mm);
    setSelectValue(`anno_nascita_${i}`, aa);
  }
  if (a.dataInizioValiditaPatente) {
    const [gg, mm, aa] = a.dataInizioValiditaPatente.split('/');
    setSelectValue(`giorno_inizio_validita_patente_${i}`, gg);
    setSelectValue(`mese_inizio_validita_patente_${i}`, mm);
    setSelectValue(`anno_inizio_validita_patente_${i}`, aa);
  }
  if (a.dataFineValiditaPatente) {
    const [gg, mm, aa] = a.dataFineValiditaPatente.split('/');
    setSelectValue(`giorno_fine_validita_patente_${i}`, gg);
    setSelectValue(`mese_fine_validita_patente_${i}`, mm);
    setSelectValue(`anno_fine_validita_patente_${i}`, aa);
  }
}

/* Step 3: genera moduli, preservando dati e precompilando autista 1 da sessione */
function mostraModuliAutisti() {
  const container = document.getElementById('autisti_container');
  const numSel = document.getElementById('num_autisti');
  if (!container || !numSel) return;

  // Salva quanto già inserito prima di rigenerare
  const prevCount = container.querySelectorAll('.autista').length;
  const cached = saveAutistiFromForm(prevCount);

  const num = parseInt(numSel.value || '1', 10);
  bookingData.autisti = bookingData.autisti || [];

  // Merge dati: prima quelli salvati, poi quelli già in stato
  const merged = [];
  for (let i = 0; i < Math.max(num, cached.length, bookingData.autisti.length); i++) {
    merged[i] = cached[i] || bookingData.autisti[i] || null;
  }
  bookingData.autisti = merged.slice(0, num);

  container.innerHTML = '';
  for (let i = 1; i <= num; i++) {
    const box = document.createElement('div');
    box.className = 'autista';
    box.innerHTML = `
      <h3>Autista ${i}</h3>
      <label>Nome e Cognome *</label>
      <input type="text" id="nome_cognome_${i}" placeholder="Mario Rossi" required />
      <label>Data di nascita *</label>
      <div class="date-inline">
        <select id="giorno_nascita_${i}"></select>
        <select id="mese_nascita_${i}"></select>
        <select id="anno_nascita_${i}"></select>
      </div>
      <label>Luogo di nascita *</label>
      <input type="text" id="luogo_nascita_${i}" placeholder="Roma" required />
      <label>Comune di residenza *</label>
      <input type="text" id="comune_residenza_${i}" placeholder="Milano" required />
      <label>Via di residenza *</label>
      <input type="text" id="via_residenza_${i}" placeholder="Via Roma" required />
      <label>Civico di residenza *</label>
      <input type="text" id="civico_residenza_${i}" placeholder="123" required />
      <label>Codice fiscale *</label>
      <input type="text" id="codice_fiscale_${i}" placeholder="RSSMRA80A01H501U" maxlength="16" style="text-transform: uppercase;" required />
      <label>Numero patente *</label>
      <input type="text" id="numero_patente_${i}" placeholder="AB1234567C" required />
      <label>Data inizio validità patente *</label>
      <div class="date-inline">
        <select id="giorno_inizio_validita_patente_${i}"></select>
        <select id="mese_inizio_validita_patente_${i}"></select>
        <select id="anno_inizio_validita_patente_${i}"></select>
      </div>
      <label>Data fine validità patente *</label>
      <div class="date-inline">
        <select id="giorno_fine_validita_patente_${i}"></select>
        <select id="mese_fine_validita_patente_${i}"></select>
        <select id="anno_fine_validita_patente_${i}"></select>
      </div>`;
    container.append(box);

    const annoCorrente = new Date().getFullYear();
    popolaTendineData(`giorno_nascita_${i}`, `mese_nascita_${i}`, `anno_nascita_${i}`, 1940, annoCorrente - 18);
    popolaTendineData(`giorno_inizio_validita_patente_${i}`, `mese_inizio_validita_patente_${i}`, `anno_inizio_validita_patente_${i}`, annoCorrente - 50, annoCorrente + 10);
    // Esteso oltre il 2025
    popolaTendineData(`giorno_fine_validita_patente_${i}`, `mese_fine_validita_patente_${i}`, `anno_fine_validita_patente_${i}`, annoCorrente, annoCorrente + 20);

    // Ripristina valori se esistono
    if (bookingData.autisti[i - 1]) {
      fillAutistaToForm(i, bookingData.autisti[i - 1]);
    }
  }

  // Precompila autista 1 e cellulare dalla sessione (se non già valorizzati)
  if (loggedCustomerData?.datiCompleti) {
    const a0 = bookingData.autisti[0];
    const vuoto = !a0 || Object.values(a0).every(v => !v);
    if (vuoto) {
      const d = loggedCustomerData.datiCompleti;
      const nome = document.getElementById('nome_cognome_1'); if (nome && d.nomeCognome) nome.value = d.nomeCognome;
      if (d.dataNascita) {
        const [gg, mm, aa] = d.dataNascita.split('/');
        setSelectValue('giorno_nascita_1', gg); setSelectValue('mese_nascita_1', mm); setSelectValue('anno_nascita_1', aa);
      }
      const luogo = document.getElementById('luogo_nascita_1'); if (luogo && d.luogoNascita) luogo.value = d.luogoNascita;
      const cf = document.getElementById('codice_fiscale_1'); if (cf && d.codiceFiscale) cf.value = d.codiceFiscale;
      const comune = document.getElementById('comune_residenza_1'); if (comune && d.comuneResidenza) comune.value = d.comuneResidenza;
      const via = document.getElementById('via_residenza_1'); if (via && d.viaResidenza) via.value = d.viaResidenza;
      const civico = document.getElementById('civico_residenza_1'); if (civico && d.civicoResidenza) civico.value = d.civicoResidenza;
      const patente = document.getElementById('numero_patente_1'); if (patente && d.numeroPatente) patente.value = d.numeroPatente;
      if (d.dataInizioValiditaPatente) {
        const [gg, mm, aa] = d.dataInizioValiditaPatente.split('/');
        setSelectValue('giorno_inizio_validita_patente_1', gg); setSelectValue('mese_inizio_validita_patente_1', mm); setSelectValue('anno_inizio_validita_patente_1', aa);
      }
      if (d.dataFineValiditaPatente) {
        const [gg, mm, aa] = d.dataFineValiditaPatente.split('/');
        setSelectValue('giorno_fine_validita_patente_1', gg); setSelectValue('mese_fine_validita_patente_1', mm); setSelectValue('anno_fine_validita_patente_1', aa);
      }
      const cell = document.getElementById('cellulare'); if (cell && d.cellulare) cell.value = d.cellulare;
    }
  }

  // Aggiorna lo stato da form in tempo reale
  for (let i = 1; i <= num; i++) {
    ['input', 'change'].forEach(evt => {
      container.addEventListener(evt, () => {
        bookingData.autisti[i - 1] = getAutistaFromForm(i);
      });
    });
  }
}

/* Step 3 -> 4 */
function vaiStep4() {
  const numAutisti = parseInt(document.getElementById('num_autisti')?.value || '0', 10);
  const cellulare = String(document.getElementById('cellulare')?.value || '').trim();
  if (!validaTelefono(cellulare)) return mostraErrore('Inserisci un numero di cellulare valido (9-15 cifre)');

  for (let i = 1; i <= numAutisti; i++) {
    const nomeCognome = String(document.getElementById(`nome_cognome_${i}`)?.value || '').trim();
    const dataNascita = getDataAutista('nascita', i);
    const luogoNascita = String(document.getElementById(`luogo_nascita_${i}`)?.value || '').trim();
    const comuneResidenza = String(document.getElementById(`comune_residenza_${i}`)?.value || '').trim();
    const viaResidenza = String(document.getElementById(`via_residenza_${i}`)?.value || '').trim();
    const civicoResidenza = String(document.getElementById(`civico_residenza_${i}`)?.value || '').trim();
    const codiceFiscale = String(document.getElementById(`codice_fiscale_${i}`)?.value || '').trim().toUpperCase();
    const numeroPatente = String(document.getElementById(`numero_patente_${i}`)?.value || '').trim();
    const dataInizioValiditaPatente = getDataAutista('inizio_validita_patente', i);
    const dataFineValiditaPatente = getDataAutista('fine_validita_patente', i);

    if (!nomeCognome || !dataNascita || !luogoNascita || !comuneResidenza || !viaResidenza || !civicoResidenza || !numeroPatente || !dataInizioValiditaPatente || !dataFineValiditaPatente) {
      return mostraErrore(`Compila tutti i campi obbligatori per l'autista ${i}`);
    }
    if (!validaCodiceFiscale(codiceFiscale)) return mostraErrore(`Codice fiscale non valido per l'autista ${i}`);
    if (nomeCognome.split(' ').length < 2) return mostraErrore(`Inserisci nome e cognome completi per l'autista ${i}`);

    const inizioPatente = new Date(convertDateToIso(dataInizioValiditaPatente));
    const finePatente = new Date(convertDateToIso(dataFineValiditaPatente));
    const oggi = new Date();
    if (finePatente < oggi) return mostraErrore(`La patente dell'autista ${i} è scaduta!`);
    if (inizioPatente >= finePatente) return mostraErrore(`Le date della patente dell'autista ${i} non sono valide`);

    const nascita = new Date(convertDateToIso(dataNascita));
    const eta = Math.floor((oggi - nascita) / (365.25 * 24 * 60 * 60 * 1000));
    if (eta < 18) return mostraErrore(`L'autista ${i} deve avere almeno 18 anni`);
    if (eta > 100) return mostraErrore(`Verifica la data di nascita dell'autista ${i}`);
  }

  bookingData.numAutisti = numAutisti;
  bookingData.cellulare = cellulare;
  bookingData.autisti = [];
  for (let i = 1; i <= numAutisti; i++) bookingData.autisti.push(getAutistaFromForm(i));

  mostraSuccesso('Dati validati con successo!');
  showStep('step4');
  mostraRiepilogoPrenotazione();
}

/* Riepilogo con DOM sicuro */
function rItem(label, value) {
  return el('div', { class: 'riepilogo-item' },
    el('span', { class: 'riepilogo-label', text: label }),
    el('span', { class: 'riepilogo-value', text: value })
  );
}
function buildModalConferma() {
  let modal = document.getElementById('modalConferma');
  if (modal) modal.remove();
  modal = el('div', { id: 'modalConferma', class: 'modal-conferma', style: 'display:none;' },
    el('div', { class: 'modal-conferma__backdrop' }),
    el('div', { class: 'modal-conferma__content' },
      el('span', { class: 'material-icons', 'aria-hidden': 'true', text: 'help_outline', style: 'font-size:32px;color:#37b24d;margin-bottom:10px;' }),
      el('h4', { text: 'Conferma prenotazione?' }),
      el('p', { text: 'Vuoi confermare e inviare definitivamente questa prenotazione?' }),
      el('div', { class: 'modal-conferma__actions' },
        el('button', { id: 'btnModalAnnulla', class: 'btn', text: 'Annulla' }),
        el('button', { id: 'btnModalInvia', class: 'btn btn--primary', text: 'Conferma e invia' })
      )
    )
  );
  modal.querySelector('.modal-conferma__backdrop')?.addEventListener('click', () => modal.style.display = 'none');
  modal.querySelector('#btnModalAnnulla')?.addEventListener('click', () => modal.style.display = 'none');
  modal.querySelector('#btnModalInvia')?.addEventListener('click', async () => { modal.style.display = 'none'; await inviaPrenotazione(); });
  document.body.append(modal);
  return modal;
}
function mostraRiepilogoPrenotazione() {
  const container = document.getElementById('riepilogo_container');
  if (!container) return;

  const secPren = el('div', { class: 'riepilogo-section' },
    el('h3', {}, el('span', { class: 'material-icons', 'aria-hidden': 'true', text: 'directions_bus' }), document.createTextNode(' Dati Prenotazione')),
    el('div', { class: 'riepilogo-grid' },
      rItem('Pulmino:', bookingData.pulmino?.nome || '-'),
      rItem('Targa:', bookingData.pulmino?.targa || '-'),
      rItem('Dal:', bookingData.dataRitiro || '-'),
      rItem('Ora ritiro:', bookingData.oraRitiro || '-'),
      rItem('Al:', bookingData.dataArrivo || '-'),
      rItem('Ora arrivo:', bookingData.oraArrivo || '-'),
      rItem('Telefono:', bookingData.cellulare || '-')
    )
  );

  const secAut = el('div', { class: 'riepilogo-section' },
    el('h3', {}, el('span', { class: 'material-icons', 'aria-hidden': 'true', text: 'person' }), document.createTextNode(' Autista/i')),
    el('div', { class: 'riepilogo-autisti' },
      ...(bookingData.autisti || []).map((a, i) =>
        el('div', { class: 'riepilogo-autista' },
          el('strong', { text: `Autista ${i + 1}` }),
          el('div', {}, el('span', { class: 'riepilogo-label', text: 'Nome:' }), document.createTextNode(' '), el('span', { class: 'riepilogo-value', text: a.nomeCognome })),
          el('div', {}, el('span', { class: 'riepilogo-label', text: 'Nascita:' }), document.createTextNode(' '), el('span', { class: 'riepilogo-value', text: `${a.dataNascita} - ${a.luogoNascita}` })),
          el('div', {}, el('span', { class: 'riepilogo-label', text: 'Codice Fiscale:' }), document.createTextNode(' '), el('span', { class: 'riepilogo-value', text: a.codiceFiscale })),
          el('div', {}, el('span', { class: 'riepilogo-label', text: 'Residenza:' }), document.createTextNode(' '), el('span', { class: 'riepilogo-value', text: `${a.comuneResidenza}, ${a.viaResidenza} ${a.civicoResidenza}` })),
          el('div', {}, el('span', { class: 'riepilogo-label', text: 'Patente:' }), document.createTextNode(' '), el('span', { class: 'riepilogo-value', text: `${a.numeroPatente} (${a.dataInizioValiditaPatente} - ${a.dataFineValiditaPatente})` }))
        )
      )
    ),
    el('div', { class: 'riepilogo-actions', style: 'text-align:center; margin-top:24px;' },
      el('button', { id: 'btnConfermaPrenotazione', class: 'btn btn--primary' },
        el('span', { class: 'material-icons', 'aria-hidden': 'true', text: 'check_circle' }),
        document.createTextNode(' Conferma e invia prenotazione')
      )
    )
  );

  const modal = buildModalConferma();
  clearAndAppend(container, el('div', { class: 'riepilogo' }, secPren, secAut), modal);

  const btnConferma = document.getElementById('btnConfermaPrenotazione');
  if (btnConferma) btnConferma.addEventListener('click', () => modal.style.display = 'flex');
}

/* Invio prenotazione */
async function inviaPrenotazione() {
  try {
    mostraLoading(true);

    // Payload minimale per CREATE: l’ID lo genera l’Apps Script
    sanitizeBookingResidence(bookingData);
    const payload = {
      action: 'create',
      cf: loggedCustomerData?.cf || '',
      prenotazione: {
        pulmino: bookingData.pulmino?.id || '',
        targa: bookingData.pulmino?.targa || '',
        dataRitiro: bookingData.dataRitiro,
        oraRitiro: bookingData.oraRitiro,
        dataArrivo: bookingData.dataArrivo,
        oraArrivo: bookingData.oraArrivo,
        cellulare: bookingData.cellulare,
        autisti: bookingData.autisti || []
      }
    };

    // Endpoint primario: gestione prenotazione (server-side genera l’ID)
    let res = await apiManageBooking(payload);

    // Fallback su endpoint prenotazioni se la web app espone create lì
    if (!res?.success) {
      const msg = String(res?.error || '').toLowerCase();
      if (msg.includes('azione') || msg.includes('action') || msg.includes('endpoint')) {
        res = await fetchJSON(SCRIPTS.prenotazioni, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
    }

    if (res?.success) {
  const createdId = res.idPrenotazione || res.id || res.bookingId || null;
  if (createdId) console.log('Nuova prenotazione ID:', createdId);
  mostraSuccesso('Prenotazione inviata correttamente.');
  // reset stato prenotazione
  bookingData = {};
  // naviga a home e aggiorna cronologia/hash
  routeTo('home');
  history.pushState({ view: 'home' }, '', '#home');
} else {
  mostraErrore(res?.error || 'Invio prenotazione non riuscito.');
}

  } catch (e) {
    console.error(e);
    mostraErrore('Errore di rete o server durante l’invio.');
  } finally {
    mostraLoading(false);
  }
}

function mostraThankYou() {
  const main = document.getElementById('mainbox');
  if (!main) return;
  clearAndAppend(main,
    el('div', { id: 'thankyou', class: 'card', style: 'text-align:center;' },
      el('div', { text: '✅', style: 'font-size:64px;' }),
      el('h2', { text: 'Prenotazione inviata!' }),
      el('p', { text: `Riceverai una conferma al numero ${asString(bookingData.cellulare, '-')}.` }),
      el('p', { text: 'Grazie per aver scelto Imbriani Noleggio!' }),
      el('button', { class: 'btn btn--primary', onclick: () => location.reload(), text: '🏠 Torna alla home' })
    )
  );
}

/* =========================
   BOOTSTRAP
========================= */

function startNewBookingWithPreFill() {
routeTo('wizard', 'step1');
history.pushState({ view: 'wizard', step: 'step1' }, '', '#step1');
showStep('step1', { skipPush: true });
  bookingData = bookingData || {};
  bookingData.autisti = bookingData.autisti || [];
}
function bootstrap() {
  // Login
   initHistory();
   // Click sul titolo → Home
const title = document.querySelector('header h1');
if (title) {
  title.style.cursor = 'pointer';
  title.addEventListener('click', () => {
    routeTo('home');
    history.pushState({ view: 'home' }, '', '#home');
  });
}
  const formLogin = document.getElementById('loginFormHomepage');
  if (formLogin) formLogin.addEventListener('submit', handleLoginSubmit);

  // Nuova prenotazione: da Home e da Area Personale
  const btnNewBooking = document.getElementById('btnNewBooking');
  if (btnNewBooking) btnNewBooking.addEventListener('click', () => startNewBookingWithPreFill());

  const btnNewBookingAP = document.getElementById('btnNewBookingAP');
  if (btnNewBookingAP) btnNewBookingAP.addEventListener('click', () => startNewBookingWithPreFill());

  // Step controls
  const btnCheck = document.getElementById('btnControllaDisponibilita');
  if (btnCheck) btnCheck.addEventListener('click', controllaDisponibilita);

  const btnToStep3Hook = document.getElementById('chiamaContinuaBtn');
  if (btnToStep3Hook) btnToStep3Hook.addEventListener('click', () => {
    if (!btnToStep3Hook.disabled) vaiStep3();
  });

  const btnToStep4 = document.getElementById('btnVaiStep4');
  if (btnToStep4) btnToStep4.addEventListener('click', vaiStep4);

  // Numero autisti change
  const numSel = document.getElementById('num_autisti');
  if (numSel) numSel.addEventListener('change', mostraModuliAutisti);

  // Prepara tendine date ritiro/arrivo (anni: oggi → oggi+1)
  const anno = new Date().getFullYear();
  popolaTendineData('giorno_ritiro', 'mese_ritiro', 'anno_ritiro', anno, anno + 1);
  popolaTendineData('giorno_arrivo', 'mese_arrivo', 'anno_arrivo', anno, anno + 1);

  updateBackButton();
}
document.addEventListener('DOMContentLoaded', bootstrap);
