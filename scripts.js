/* Imbriani Noleggio – scripts.js (compat refactor: DOM sicuro, no handler inline, flussi invariati)
   Versione 3.2.0
*/
'use strict';

/* =========================
   CONFIG E COSTANTI
========================= */
console.log('Imbriani Noleggio - Versione codice: 3.2.0');

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
    else if (k === 'html') node.innerHTML = String(v); // usare solo per frammenti strettamente statici
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

/* =========================
   VALIDAZIONI E FORMAT
========================= */
function validaCodiceFiscale(cf) {
  const regex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
  return regex.test(String(cf || '').toUpperCase());
}
function validaTelefono(tel) {
  return /^[0-9]{9,12}$/.test(String(tel || '').replace(/\s+/g, ''));
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
   LOGIN E AREA PERSONALE
========================= */
function setupAreaPersonale() {
  const btnPren = document.getElementById('btnVisualizzaPrenotazioni');
  const btnDati = document.getElementById('btnVisualizzaDati');
  const btnLogout = document.getElementById('btnLogout');
  if (btnPren) btnPren.addEventListener('click', () => { if (loggedCustomerData?.cf) caricaPrenotazioniCliente(loggedCustomerData.cf); });
  if (btnDati) btnDati.addEventListener('click', () => { mostraDatiCliente(loggedCustomerData?.datiCompleti || null); });
  if (btnLogout) btnLogout.addEventListener('click', () => {
    loggedCustomerData = null;
    const area = document.getElementById('areaPersonale'); if (area) area.style.display = 'none';
    const home = document.getElementById('homepage'); if (home) home.style.display = 'block';
    const cont = document.getElementById('contenutoPersonale'); if (cont) cont.innerHTML = '';
  });
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
      mostraErrore('Nessuna prenotazione trovata.');
    }
    loggedCustomerData = { cf, datiCompleti: resultCliente?.success ? resultCliente.cliente : null };
    setupAreaPersonale();
    caricaPrenotazioniCliente(cf);
    const area = document.getElementById('areaPersonale'); if (area) area.style.display = 'block';
    const home = document.getElementById('homepage'); if (home) home.style.display = 'none';
    mostraSuccesso('Accesso completato.');
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
function mostraDatiCliente(dati) { renderDatiCliente(dati); }

/* =========================
   MODIFICA / CANCELLAZIONE PRENOTAZIONE
========================= */
function modificaPrenotazione(p) {
  // Genera un form sicuro senza innerHTML con dati non sanificati
  try { if (typeof p === 'string') p = JSON.parse(p); } catch {}
  const cont = document.getElementById('contenutoPersonale');
  if (!cont) return;
  const form = el('form', { id: 'formModificaPrenotazione', class: 'card' },
    el('h3', { text: 'Modifica prenotazione' }),
    el('label', {}, el('span', { text: 'Nome ' }), el('input', { type: 'text', name: 'Nome', value: asString(p.Nome || p.nomeCognome || ''), required: 'true' })),
    el('label', {}, el('span', { text: 'Data di nascita ' }), el('input', { type: 'text', name: 'Data di nascita', value: asString(p['Data di nascita'] || ''), required: 'true' })),
    el('label', {}, el('span', { text: 'Luogo di nascita ' }), el('input', { type: 'text', name: 'Luogo di nascita', value: asString(p['Luogo di nascita'] || ''), required: 'true' })),
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
function showStep(stepId) {
  qsa('.step').forEach(s => s.classList.remove('active'));
  const step = document.getElementById(stepId);
  if (step) step.classList.add('active');
  updateBackButton();
}
function updateBackButton() {
  let backBtn = document.getElementById('backBtn');
  if (!backBtn) {
    backBtn = el('button', { id: 'backBtn', class: 'btn-back', onclick: goBack },
      el('span', { class: 'material-icons', text: 'arrow_back' }), ' Indietro'
    );
    const mainbox = document.getElementById('mainbox');
    if (mainbox) mainbox.insertBefore(backBtn, mainbox.firstChild);
  }
  const isHomeVisible = (document.getElementById('homepage')?.style.display !== 'none');
  if (qs('#step1')?.classList.contains('active') || isHomeVisible) backBtn.style.display = 'none';
  else backBtn.style.display = 'flex';
}
function goBack() {
  if (qs('#step4')?.classList.contains('active')) showStep('step3');
  else if (qs('#step3')?.classList.contains('active')) showStep('step2');
  else if (qs('#step2')?.classList.contains('active')) showStep('step1');
  else {
    const main = document.getElementById('mainbox'); if (main) main.style.display = 'none';
    const home = document.getElementById('homepage'); if (home) home.style.display = 'block';
    const res = document.getElementById('loginResultHomepage'); if (res) res.textContent = '';
  }
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

  const domani = new Date(); domani.setDate(domani.getDate() + 1); domani.setHours(0, 0, 0, 0);
  if (dR < domani) return mostraErrore('La data di ritiro deve essere almeno da domani in poi.');

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

/* Step 3 -> 4 */
function vaiStep4() {
  const numAutisti = parseInt(document.getElementById('num_autisti')?.value || '0', 10);
  const cellulare = String(document.getElementById('cellulare')?.value || '').trim();
  if (!validaTelefono(cellulare)) return mostraErrore('Inserisci un numero di cellulare valido (9-12 cifre)');
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
  for (let i = 1; i <= numAutisti; i++) {
    bookingData.autisti.push({
      nomeCognome: String(document.getElementById(`nome_cognome_${i}`)?.value || '').trim(),
      dataNascita: getDataAutista('nascita', i),
      luogoNascita: String(document.getElementById(`luogo_nascita_${i}`)?.value || '').trim(),
      comuneResidenza: String(document.getElementById(`comune_residenza_${i}`)?.value || '').trim(),
      viaResidenza: String(document.getElementById(`via_residenza_${i}`)?.value || '').trim(),
      civicoResidenza: String(document.getElementById(`civico_residenza_${i}`)?.value || '').trim(),
      codiceFiscale: String(document.getElementById(`codice_fiscale_${i}`)?.value || '').trim().toUpperCase(),
      numeroPatente: String(document.getElementById(`numero_patente_${i}`)?.value || '').trim(),
      dataInizioValiditaPatente: getDataAutista('inizio_validita_patente', i),
      dataFineValiditaPatente: getDataAutista('fine_validita_patente', i)
    });
  }
  mostraSuccesso('Dati validati con successo!');
  showStep('step4');
  mostraRiepilogoPrenotazione();
}

/* Riepilogo con DOM sicuro */
function mostraRiepilogoPrenotazione() {
  const container = document.getElementById('riepilogo_container');
  if (!container) return;

  const secPren = el('div', { class: 'riepilogo-section' },
    el('h3', {}, el('span', { class: 'material-icons', 'aria-hidden': 'true', text: 'directions_bus' }), ' Dati Prenotazione'),
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
    el('h3', {}, el('span', { class: 'material-icons', 'aria-hidden': 'true', text: 'person' }), ' Autista/i'),
    el('div', { class: 'riepilogo-autisti' },
      ...(bookingData.autisti || []).map((a, i) =>
        el('div', { class: 'riepilogo-autista' },
          el('strong', { text: `Autista ${i + 1}` }),
          el('div', {}, el('span', { class: 'riepilogo-label', text: 'Nome:' }), ' ', el('span', { class: 'riepilogo-value', text: a.nomeCognome })),
          el('div', {}, el('span', { class: 'riepilogo-label', text: 'Nascita:' }), ' ', el('span', { class: 'riepilogo-value', text: `${a.dataNascita} - ${a.luogoNascita}` })),
          el('div', {}, el('span', { class: 'riepilogo-label', text: 'Codice Fiscale:' }), ' ', el('span', { class: 'riepilogo-value', text: a.codiceFiscale })),
          el('div', {}, el('span', { class: 'riepilogo-label', text: 'Residenza:' }), ' ', el('span', { class: 'riepilogo-value', text: `${a.comuneResidenza}, ${a.viaResidenza} ${a.civicoResidenza}` })),
          el('div', {}, el('span', { class: 'riepilogo-label', text: 'Patente:' }), ' ', el('span', { class: 'riepilogo-value', text: `${a.numeroPatente} (${a.dataInizioValiditaPatente} - ${a.dataFineValiditaPatente})` }))
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

/* Invio prenotazione */
async function inviaPrenotazione() {
  try {
    mostraLoading(true);
    // Adatta i nomi dei campi al backend Apps Script
    const payload = {
      action: 'create',
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
    const res = await apiManageBooking(payload);
    if (res?.success) {
      mostraThankYou();
    } else {
      mostraErrore(res?.error || 'Invio prenotazione fallito.');
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
   MODULI AUTISTI
========================= */
function mostraModuliAutisti() {
  const container = document.getElementById('autisti_container');
  const num = parseInt(document.getElementById('num_autisti')?.value || '1', 10);
  if (!container) return;
  container.innerHTML = '';
  for (let i = 1; i <= num; i++) {
    const box = el('div', { class: 'autista' },
      el('h3', { text: `Autista ${i}` }),
      el('label', {}, el('span', { text: 'Nome e Cognome *' }), el('input', { type: 'text', id: `nome_cognome_${i}`, placeholder: 'Mario Rossi', required: 'true' })),
      el('label', {}, el('span', { text: 'Data di nascita *' })),
      el('div', { class: 'date-inline' },
        el('select', { id: `giorno_nascita_${i}` }), el('select', { id: `mese_nascita_${i}` }), el('select', { id: `anno_nascita_${i}` })
      ),
      el('label', {}, el('span', { text: 'Luogo di nascita *' }), el('input', { type: 'text', id: `luogo_nascita_${i}`, placeholder: 'Roma', required: 'true' })),
      el('label', {}, el('span', { text: 'Comune di residenza *' }), el('input', { type: 'text', id: `comune_residenza_${i}`, placeholder: 'Milano', required: 'true' })),
      el('label', {}, el('span', { text: 'Via di residenza *' }), el('input', { type: 'text', id: `via_residenza_${i}`, placeholder: 'Via Roma', required: 'true' })),
      el('label', {}, el('span', { text: 'Civico di residenza *' }), el('input', { type: 'text', id: `civico_residenza_${i}`, placeholder: '123', required: 'true' })),
      el('label', {}, el('span', { text: 'Codice fiscale *' }), el('input', { type: 'text', id: `codice_fiscale_${i}`, placeholder: 'RSSMRA80A01H501U', maxlength: '16', style: 'text-transform:uppercase;', required: 'true' })),
      el('label', {}, el('span', { text: 'Numero patente *' }), el('input', { type: 'text', id: `numero_patente_${i}`, placeholder: 'AB1234567C', required: 'true' })),
      el('label', {}, el('span', { text: 'Data inizio validità patente *' })),
      el('div', { class: 'date-inline' },
        el('select', { id: `giorno_inizio_validita_patente_${i}` }), el('select', { id: `mese_inizio_validita_patente_${i}` }), el('select', { id: `anno_inizio_validita_patente_${i}` })
      ),
      el('label', {}, el('span', { text: 'Data fine validità patente *' })),
      el('div', { class: 'date-inline' },
        el('select', { id: `giorno_fine_validita_patente_${i}` }), el('select', { id: `mese_fine_validita_patente_${i}` }), el('select', { id: `anno_fine_validita_patente_${i}` })
      )
    );
    container.append(box);
  }
  const annoCorrente = new Date().getFullYear();
  for (let i = 1; i <= num; i++) {
    popolaTendineData(`giorno_nascita_${i}`, `mese_nascita_${i}`, `anno_nascita_${i}`, 1940, annoCorrente - 18);
    popolaTendineData(`giorno_inizio_validita_patente_${i}`, `mese_inizio_validita_patente_${i}`, `anno_inizio_validita_patente_${i}`, annoCorrente - 50, annoCorrente + 10);
    popolaTendineData(`giorno_fine_validita_patente_${i}`, `mese_fine_validita_patente_${i}`, `anno_fine_validita_patente_${i}`, annoCorrente, annoCorrente + 15);
  }

  // Precompilazione autista 1 + cellulare se disponibili
  if (loggedCustomerData?.datiCompleti) {
    setTimeout(() => {
      const d = loggedCustomerData.datiCompleti;
      const nomeInput = document.getElementById('nome_cognome_1'); if (nomeInput && d.nomeCognome) nomeInput.value = d.nomeCognome;
      if (d.dataNascita) {
        const [gg, mm, aa] = d.dataNascita.split('/');
        const selG = document.getElementById('giorno_nascita_1'); if (selG && gg) selG.value = gg;
        const selM = document.getElementById('mese_nascita_1'); if (selM && mm) selM.value = mm;
        const selA = document.getElementById('anno_nascita_1'); if (selA && aa) selA.value = aa;
      }
      const luogo = document.getElementById('luogo_nascita_1'); if (luogo && d.luogoNascita) luogo.value = d.luogoNascita;
      const cf = document.getElementById('codice_fiscale_1'); if (cf && d.codiceFiscale) cf.value = d.codiceFiscale;
      const comune = document.getElementById('comune_residenza_1'); if (comune && d.comuneResidenza) comune.value = d.comuneResidenza;
      const via = document.getElementById('via_residenza_1'); if (via && d.viaResidenza) via.value = d.viaResidenza;
      const civico = document.getElementById('civico_residenza_1'); if (civico && d.civicoResidenza) civico.value = d.civicoResidenza;
      const patente = document.getElementById('numero_patente_1'); if (patente && d.numeroPatente) patente.value = d.numeroPatente;
      if (d.dataInizioValiditaPatente) {
        const [gg, mm, aa] = d.dataInizioValiditaPatente.split('/');
        const G = document.getElementById('giorno_inizio_validita_patente_1'); if (G && gg) G.value = gg;
        const M = document.getElementById('mese_inizio_validita_patente_1'); if (M && mm) M.value = mm;
        const A = document.getElementById('anno_inizio_validita_patente_1'); if (A && aa) A.value = aa;
      }
      if (d.dataFineValiditaPatente) {
        const [gg, mm, aa] = d.dataFineValiditaPatente.split('/');
        const G = document.getElementById('giorno_fine_validita_patente_1'); if (G && gg) G.value = gg;
        const M = document.getElementById('mese_fine_validita_patente_1'); if (M && mm) M.value = mm;
        const A = document.getElementById('anno_fine_validita_patente_1'); if (A && aa) A.value = aa;
      }
      const cell = document.getElementById('cellulare'); if (cell && d.cellulare) cell.value = d.cellulare;
      mostraSuccesso('Dati del primo autista e cellulare precompilati automaticamente!');
    }, 150);
  }
}

/* =========================
   BOOTSTRAP
========================= */
function startNewBookingWithPreFill() {
  const home = document.getElementById('homepage'); if (home) home.style.display = 'none';
  const mainbox = document.getElementById('mainbox'); if (mainbox) mainbox.style.display = 'flex';
  showStep('step1');
  bookingData = {};
  if (loggedCustomerData) {
    const num = document.getElementById('num_autisti'); if (num) num.value = '1';
    mostraModuliAutisti();
  }
}
function bootstrap() {
  // Login
  const formLogin = document.getElementById('loginFormHomepage');
  if (formLogin) formLogin.addEventListener('submit', handleLoginSubmit);
  // Nuova prenotazione
  const btnNewBooking = document.getElementById('btnNewBooking');
  if (btnNewBooking) btnNewBooking.addEventListener('click', () => { startNewBookingWithPreFill(); });
  // Step controls (se i bottoni esistono in DOM)
  const btnCheck = document.getElementById('btnControllaDisponibilita');
  if (btnCheck) btnCheck.addEventListener('click', controllaDisponibilita);
  const btnToStep3 = document.getElementById('btnVaiStep3');
  if (btnToStep3) btnToStep3.addEventListener('click', vaiStep3);
  const btnToStep4 = document.getElementById('btnVaiStep4');
  if (btnToStep4) btnToStep4.addEventListener('click', vaiStep4);
  // Numero autisti change
  const numSel = document.getElementById('num_autisti');
  if (numSel) numSel.addEventListener('change', mostraModuliAutisti);
  // Prepara tendine date ritiro/arrivo
  const anno = new Date().getFullYear();
  popolaTendineData('giorno_ritiro', 'mese_ritiro', 'anno_ritiro', anno, anno + 1);
  popolaTendineData('giorno_arrivo', 'mese_arrivo', 'anno_arrivo', anno, anno + 1);
  // Focus/back
  updateBackButton();
}
document.addEventListener('DOMContentLoaded', bootstrap);
