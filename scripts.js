console.log('Imbriani Noleggio - Versione codice: 2.7.0 - Contact Required');

const pulmini = [
  { id: "ducato_lungo", nome: "Fiat Ducato (Passo lungo)", targa: "EC787NM" },
  { id: "ducato_corto", nome: "Fiat Ducato (Passo corto)", targa: "DN391FW" },
  { id: "peugeot", nome: "Peugeot Expert Tepee", targa: "DL291XZ" }
];

let loggedCustomerData = null;
let bookingData = {};

const SCRIPTS = {
  proxy: 'https://proxy-cors-google-apps.onrender.com/',
  prenotazioni: 'https://script.google.com/macros/s/AKfycbyMPuvESaAJ7bIraipTya9yUKnyV8eYbm-r8CX42KRvDQsX0f44QBsaqQOY8KVYFBE/exec',
  datiCliente: 'https://script.google.com/macros/s/AKfycbxnC-JSK4YXvV8GF6ED9uK3SSNYs3uAFAmyji6KB_eQ60QAqXIHbTM-18F7-Zu47bo/exec',
  disponibilita: 'https://script.google.com/macros/s/AKfycbwhEK3IH-hLGYpGXHRjcYdUaW2e3He485XpgcRVr0GBSyE4v4-gSCp5vnSCbn5ocNI/exec',
  salvaPrenotazione: 'https://script.google.com/macros/s/AKfycbwy7ZO3hCMcjhPuOMFyJoJl_IRyDr_wfhALadDhFt__Yjg3FBFWqt7wbCjIm0iim9Ya/exec'
};

const CONTATTO_PROPRIETARIO = '328 658 9618';

function validaCodiceFiscale(cf) {
  const regex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
  return regex.test(cf.toUpperCase());
}

function validaTelefono(tel) {
  const regex = /^[0-9]{10}$/;
  return regex.test(tel.replace(/\s/g, ''));
}

function mostraErrore(messaggio) {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `position: fixed; top: 24px; right: 24px; padding: 16px 20px; background: rgba(255, 230, 230, 0.95); color: #c00; border: 1px solid rgba(192, 0, 0, 0.3); border-left: 4px solid #c00; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); z-index: 10000; font-size: 14px; font-weight: 500; max-width: 420px; display: flex; align-items: center; gap: 12px; animation: slideInRight 0.3s ease-out;`;
  errorDiv.innerHTML = `<span style="font-size: 24px;">⚠️</span><span>${messaggio}</span>`;
  document.body.prepend(errorDiv);
  setTimeout(() => { errorDiv.style.transition = 'all 0.3s ease-out'; errorDiv.style.transform = 'translateX(450px)'; errorDiv.style.opacity = '0'; setTimeout(() => errorDiv.remove(), 300); }, 4000);
}

function mostraSuccesso(messaggio) {
  const successDiv = document.createElement('div');
  successDiv.style.cssText = `position: fixed; top: 24px; right: 24px; padding: 16px 20px; background: rgba(230, 255, 230, 0.95); color: #0a0; border: 1px solid rgba(0, 170, 0, 0.3); border-left: 4px solid #0a0; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); z-index: 10000; font-size: 14px; font-weight: 500; max-width: 420px; display: flex; align-items: center; gap: 12px; animation: slideInRight 0.3s ease-out;`;
  successDiv.innerHTML = `<span style="font-size: 24px;">✅</span><span>${messaggio}</span>`;
  document.body.prepend(successDiv);
  setTimeout(() => { successDiv.style.transition = 'all 0.3s ease-out'; successDiv.style.transform = 'translateX(450px)'; successDiv.style.opacity = '0'; setTimeout(() => successDiv.remove(), 300); }, 4000);
}

function mostraLoading(show = true) {
  let loader = document.getElementById('globalLoader');
  if (show) {
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'globalLoader';
      loader.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(4px);`;
      loader.innerHTML = `<div style="text-align: center; color: white;"><div style="border: 4px solid rgba(255, 255, 255, 0.3); border-top: 4px solid #fff; border-radius: 50%; width: 56px; height: 56px; animation: spin 0.8s linear infinite; margin: 0 auto 20px;"></div><p style="font-size: 16px; font-weight: 500;">Caricamento in corso...</p></div>`;
      document.body.appendChild(loader);
      if (!document.getElementById('spinAnimation')) {
        const style = document.createElement('style');
        style.id = 'spinAnimation';
        style.textContent = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } } @keyframes slideInRight { from { transform: translateX(450px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`;
        document.head.appendChild(style);
      }
    }
    loader.style.display = 'flex';
  } else {
    if (loader) loader.style.display = 'none';
  }
}

function convertDateToIso(dateEuro) {
  let parts = dateEuro.split('/');
  if (parts.length !== 3) return '';
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function getData(prefix) {
  const gg = document.getElementById('giorno_' + prefix).value;
  const mm = document.getElementById('mese_' + prefix).value;
  const aa = document.getElementById('anno_' + prefix).value;
  return gg && mm && aa ? `${gg}/${mm}/${aa}` : '';
}

function getDataAutista(tipo, i) {
  const gg = document.getElementById(`giorno_${tipo}_${i}`).value;
  const mm = document.getElementById(`mese_${tipo}_${i}`).value;
  const aa = document.getElementById(`anno_${tipo}_${i}`).value;
  return gg && mm && aa ? `${gg}/${mm}/${aa}` : '';
}

document.getElementById('loginFormHomepage').addEventListener('submit', function(event) {
  event.preventDefault();
  const cf = document.getElementById('cfInputHomepage').value.trim().toUpperCase();
  const loginResult = document.getElementById('loginResultHomepage');
  loginResult.textContent = '';
  if (!validaCodiceFiscale(cf)) { mostraErrore('Codice fiscale non valido. Deve essere di 16 caratteri (es: RSSMRA80A01H501U)'); return; }
  mostraLoading(true);
  Promise.all([
    fetch(SCRIPTS.proxy + SCRIPTS.prenotazioni, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cf }) }).then(r => r.text()).then(t => JSON.parse(t)),
    fetch(SCRIPTS.proxy + SCRIPTS.datiCliente, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cf }) }).then(r => r.text()).then(t => JSON.parse(t))
  ]).then(([dataPrenotazioni, dataDatiCliente]) => {
    mostraLoading(false);
    console.log('=== DEBUG LOGIN ==='); console.log('Prenotazioni:', dataPrenotazioni); console.log('Dati Cliente:', dataDatiCliente);
    if (!dataPrenotazioni.success) { mostraErrore('Errore nel recupero prenotazioni: ' + (dataPrenotazioni.error || 'Errore non specificato')); return; }
    if (!dataPrenotazioni.prenotazioni || dataPrenotazioni.prenotazioni.length === 0) { mostraErrore('Nessuna prenotazione trovata per questo codice fiscale.'); return; }
    loggedCustomerData = { cf: cf, datiCompleti: dataDatiCliente.success ? dataDatiCliente.cliente : null };
    const nomeCliente = loggedCustomerData.datiCompleti?.nomeCognome || '';
    mostraSuccesso(`Benvenuto ${nomeCliente}! Trovate ${dataPrenotazioni.prenotazioni.length} prenotazioni.`);
    let listaPrenotazioniHtml = '<div class="prenotazioni-container"><h3>Le tue prenotazioni:</h3>';
    dataPrenotazioni.prenotazioni.forEach(item => {
      let statoClass = '';
      if (item.stato === 'Prenotato') statoClass = 'status--info';
      else if (item.stato === 'In corso') statoClass = 'status--warning';
      else if (item.stato === 'Completato') statoClass = 'status--success';
      listaPrenotazioniHtml += `<div class="card prenotazione-card"><div class="card__body"><div class="prenotazione-header"><span class="material-icons">directions_bus</span><strong>${item.targa || 'N/D'}</strong></div><div class="prenotazione-date"><div class="date-item"><span class="material-icons">event</span><span><strong>Dal:</strong> ${item.dal || 'N/D'}</span></div><div class="date-item"><span class="material-icons">event</span><span><strong>Al:</strong> ${item.al || 'N/D'}</span></div></div><div class="prenotazione-stato"><span class="status ${statoClass}">${item.stato || 'N/D'}</span></div></div></div>`;
    });
    listaPrenotazioniHtml += '</div><button id="btnNewBookingFromLogin" class="btn btn--primary"><span class="material-icons">add</span> Prenota un nuovo noleggio</button>';
    loginResult.innerHTML = listaPrenotazioniHtml;
    document.getElementById('btnNewBookingFromLogin').addEventListener('click', () => { startNewBookingWithPreFill(); });
  }).catch(err => { mostraLoading(false); console.error('Errore login:', err); mostraErrore('Errore durante la ricerca: ' + err.message); });
});

document.getElementById('btnNewBooking').addEventListener('click', () => { loggedCustomerData = null; startNewBookingWithPreFill(); });

function startNewBookingWithPreFill() {
  document.getElementById('homepage').style.display = 'none';
  const mainbox = document.getElementById('mainbox');
  mainbox.style.display = 'flex';
  showStep('step1');
  bookingData = {};
  if (loggedCustomerData) { document.getElementById('num_autisti').value = '1'; mostraModuliAutisti(); }
}

function showStep(stepId) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  const step = document.getElementById(stepId);
  if (step) step.classList.add('active');
  updateBackButton();
}

function updateBackButton() {
  let backBtn = document.getElementById('backBtn');
  if (!backBtn) {
    backBtn = document.createElement('button');
    backBtn.id = 'backBtn';
    backBtn.className = 'btn-back';
    backBtn.innerHTML = '<span class="material-icons">arrow_back</span> Indietro';
    backBtn.onclick = goBack;
    const mainbox = document.getElementById('mainbox');
    if (mainbox) mainbox.insertBefore(backBtn, mainbox.firstChild);
  }
  if (document.getElementById('step1').classList.contains('active') || document.getElementById('homepage').style.display !== 'none') {
    backBtn.style.display = 'none';
  } else {
    backBtn.style.display = 'flex';
  }
}

function goBack() {
  if (document.getElementById('step4').classList.contains('active')) showStep('step3');
  else if (document.getElementById('step3').classList.contains('active')) showStep('step2');
  else if (document.getElementById('step2').classList.contains('active')) showStep('step1');
  else { document.getElementById('mainbox').style.display = 'none'; document.getElementById('homepage').style.display = 'block'; document.getElementById('loginResultHomepage').innerHTML = ''; }
}

function controllaDisponibilita() {
  const dataRitiroStr = getData('ritiro');
  const oraRitiro = document.getElementById('ora_partenza').value;
  const dataArrivoStr = getData('arrivo');
  const oraArrivo = document.getElementById('ora_arrivo').value;
  if (!dataRitiroStr || !oraRitiro || !dataArrivoStr || !oraArrivo) { mostraErrore('Inserisci data e ora validi per ritiro e arrivo.'); return; }
  const dateRitiro = new Date(`${dataRitiroStr.split('/')[2]}-${dataRitiroStr.split('/')[1]}-${dataRitiroStr.split('/')[0]}T${oraRitiro}`);
  const dateArrivo = new Date(`${dataArrivoStr.split('/')[2]}-${dataArrivoStr.split('/')[1]}-${dataArrivoStr.split('/')[0]}T${oraArrivo}`);
  if (dateRitiro >= dateArrivo) { mostraErrore("La data/ora di arrivo deve essere successiva a quella di ritiro."); return; }
  const domani = new Date(); domani.setDate(domani.getDate() + 1); domani.setHours(0, 0, 0, 0);
  if (dateRitiro < domani) { mostraErrore("La data di ritiro deve essere almeno da domani in poi."); return; }
  bookingData.dataRitiro = dataRitiroStr; bookingData.oraRitiro = oraRitiro; bookingData.dataArrivo = dataArrivoStr; bookingData.oraArrivo = oraArrivo;
  mostraLoading(true);
  fetch(SCRIPTS.proxy + SCRIPTS.disponibilita, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'getPrenotazioni' }) })
  .then(response => response.json())
  .then(data => {
    mostraLoading(false);
    if (!data.success) { mostraErrore('Errore nel recupero delle prenotazioni: ' + (data.error || 'Errore sconosciuto')); return; }
    const arrayPrenotazioni = data.prenotazioni;
    const disponibili = pulmini.filter(p => { return !arrayPrenotazioni.some(pren => { if (pren.targa !== p.targa) return false; const inizio = new Date(pren.inizio); const fine = new Date(pren.fine); return !(fine < dateRitiro || inizio > dateArrivo); }); });
    const select = document.getElementById('scelta_pulmino');
    if (!select) return;
    select.innerHTML = '<option value="">-- Seleziona un pulmino --</option>' + disponibili.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
    document.getElementById('num_disponibili').textContent = disponibili.length;
    if (disponibili.length === 0) { mostraErrore('Nessun pulmino disponibile per la fascia selezionata!'); return; }
    mostraSuccesso(`Trovati ${disponibili.length} pulmini disponibili!`);
    showStep('step2');
    const continuaBtn = document.getElementById('chiamaContinuaBtn');
    continuaBtn.disabled = true;
    select.addEventListener('change', function () { 
      continuaBtn.disabled = !this.value; 
      if (this.value) {
        bookingData.pulmino = pulmini.find(p => p.id === this.value);
        mostraAvvisoContatto();
      }
    });
  }).catch(err => { mostraLoading(false); mostraErrore('Errore durante il controllo disponibilità: ' + err.message); });
}

function mostraAvvisoContatto() {
  const existingBanner = document.getElementById('contact-banner');
  if (existingBanner) existingBanner.remove();
  
  const banner = document.createElement('div');
  banner.id = 'contact-banner';
  banner.style.cssText = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px;
    border-radius: 12px;
    margin: 20px 0;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    animation: slideInRight 0.3s ease-out;
  `;
  banner.innerHTML = `
    <div style="display: flex; align-items: center; gap: 16px;">
      <span style="font-size: 48px;">📞</span>
      <div style="flex: 1;">
        <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">Prima di continuare</h3>
        <p style="margin: 0 0 12px 0; font-size: 14px; opacity: 0.9;">
          Contatta il proprietario per concordare il prezzo del noleggio
        </p>
        <a href="tel:${CONTATTO_PROPRIETARIO.replace(/\s/g, '')}" 
           style="display: inline-flex; align-items: center; gap: 8px; background: white; color: #667eea; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; transition: transform 0.2s;">
          <span class="material-icons" style="font-size: 20px;">phone</span>
          ${CONTATTO_PROPRIETARIO}
        </a>
      </div>
    </div>
  `;
  const step2 = document.getElementById('step2');
  const selectContainer = step2.querySelector('#scelta_pulmino').parentElement;
  selectContainer.parentNode.insertBefore(banner, selectContainer.nextSibling);
}

function vaiStep3() { showStep('step3'); mostraModuliAutisti(); }

function vaiStep4() {
  const numAutisti = parseInt(document.getElementById('num_autisti').value);
  const cellulare = document.getElementById('cellulare').value.trim();
  if (!validaTelefono(cellulare)) { mostraErrore('Inserisci un numero di cellulare valido (10 cifre)'); return; }
  for (let i = 1; i <= numAutisti; i++) {
    const nomeCognome = document.getElementById(`nome_cognome_${i}`).value.trim();
    const dataNascita = getDataAutista('nascita', i);
    const luogoNascita = document.getElementById(`luogo_nascita_${i}`).value.trim();
    const comuneResidenza = document.getElementById(`comune_residenza_${i}`).value.trim();
    const viaResidenza = document.getElementById(`via_residenza_${i}`).value.trim();
    const civicoResidenza = document.getElementById(`civico_residenza_${i}`).value.trim();
    const codiceFiscale = document.getElementById(`codice_fiscale_${i}`).value.trim().toUpperCase();
    const numeroPatente = document.getElementById(`numero_patente_${i}`).value.trim();
    const dataInizioValiditaPatente = getDataAutista('inizio_validita_patente', i);
    const dataFineValiditaPatente = getDataAutista('fine_validita_patente', i);
    if (!nomeCognome || !dataNascita || !luogoNascita || !comuneResidenza || !viaResidenza || !civicoResidenza || !numeroPatente || !dataInizioValiditaPatente || !dataFineValiditaPatente) {
      mostraErrore(`Compila tutti i campi obbligatori per l'autista ${i}`); return;
    }
    if (!validaCodiceFiscale(codiceFiscale)) { mostraErrore(`Codice fiscale non valido per l'autista ${i}`); return; }
    if (nomeCognome.split(' ').length < 2) { mostraErrore(`Inserisci nome e cognome completi per l'autista ${i}`); return; }
    const inizioPatente = new Date(convertDateToIso(dataInizioValiditaPatente));
    const finePatente = new Date(convertDateToIso(dataFineValiditaPatente));
    const oggi = new Date();
    if (finePatente < oggi) { mostraErrore(`La patente dell'autista ${i} è scaduta!`); return; }
    if (inizioPatente >= finePatente) { mostraErrore(`Le date della patente dell'autista ${i} non sono valide`); return; }
    const nascita = new Date(convertDateToIso(dataNascita));
    const eta = Math.floor((oggi - nascita) / (365.25 * 24 * 60 * 60 * 1000));
    if (eta < 18) { mostraErrore(`L'autista ${i} deve avere almeno 18 anni`); return; }
    if (eta > 100) { mostraErrore(`Verifica la data di nascita dell'autista ${i}`); return; }
  }
  bookingData.numAutisti = numAutisti; bookingData.cellulare = cellulare; bookingData.autisti = [];
  for (let i = 1; i <= numAutisti; i++) {
    bookingData.autisti.push({
      nomeCognome: document.getElementById(`nome_cognome_${i}`).value.trim(), dataNascita: getDataAutista('nascita', i), luogoNascita: document.getElementById(`luogo_nascita_${i}`).value.trim(), comuneResidenza: document.getElementById(`comune_residenza_${i}`).value.trim(), viaResidenza: document.getElementById(`via_residenza_${i}`).value.trim(), civicoResidenza: document.getElementById(`civico_residenza_${i}`).value.trim(), codiceFiscale: document.getElementById(`codice_fiscale_${i}`).value.trim().toUpperCase(), numeroPatente: document.getElementById(`numero_patente_${i}`).value.trim(), dataInizioValiditaPatente: getDataAutista('inizio_validita_patente', i), dataFineValiditaPatente: getDataAutista('fine_validita_patente', i)
    });
  }
  mostraSuccesso('Dati validati con successo!'); mostraRiepilogo(); showStep('step4');
}

function mostraRiepilogo() {
  const container = document.getElementById('riepilogo_container');
  if (!container) return;
  let html = '<div class="riepilogo">';
  html += `<div class="riepilogo-section"><h3>📋 Dettagli Prenotazione</h3><div class="riepilogo-grid"><div class="riepilogo-item"><span class="riepilogo-label">Pulmino:</span><span class="riepilogo-value">${bookingData.pulmino.nome} (${bookingData.pulmino.targa})</span></div><div class="riepilogo-item"><span class="riepilogo-label">Ritiro:</span><span class="riepilogo-value">${bookingData.dataRitiro} alle ${bookingData.oraRitiro}</span></div><div class="riepilogo-item"><span class="riepilogo-label">Riconsegna:</span><span class="riepilogo-value">${bookingData.dataArrivo} alle ${bookingData.oraArrivo}</span></div><div class="riepilogo-item"><span class="riepilogo-label">Cellulare di riferimento:</span><span class="riepilogo-value">${bookingData.cellulare}</span></div></div></div>`;
  bookingData.autisti.forEach((autista, index) => {
    html += `<div class="riepilogo-section"><h3>👤 Autista ${index + 1}</h3><div class="riepilogo-grid"><div class="riepilogo-item"><span class="riepilogo-label">Nome e Cognome:</span><span class="riepilogo-value">${autista.nomeCognome}</span></div><div class="riepilogo-item"><span class="riepilogo-label">Data di nascita:</span><span class="riepilogo-value">${autista.dataNascita}</span></div><div class="riepilogo-item"><span class="riepilogo-label">Luogo di nascita:</span><span class="riepilogo-value">${autista.luogoNascita}</span></div><div class="riepilogo-item"><span class="riepilogo-label">Codice Fiscale:</span><span class="riepilogo-value">${autista.codiceFiscale}</span></div><div class="riepilogo-item"><span class="riepilogo-label">Residenza:</span><span class="riepilogo-value">${autista.viaResidenza} ${autista.civicoResidenza}, ${autista.comuneResidenza}</span></div><div class="riepilogo-item"><span class="riepilogo-label">Patente:</span><span class="riepilogo-value">${autista.numeroPatente}</span></div><div class="riepilogo-item"><span class="riepilogo-label">Validità patente:</span><span class="riepilogo-value">Dal ${autista.dataInizioValiditaPatente} al ${autista.dataFineValiditaPatente}</span></div></div></div>`;
  });
  html += `<div class="riepilogo-actions"><button onclick="confermaPrenotazione()" class="btn btn--primary btn--lg btn--full-width">✅ Conferma e Invia Prenotazione</button><p style="text-align: center; margin-top: 12px; font-size: 13px; color: var(--color-text-secondary);">Verifica attentamente i dati prima di confermare</p></div></div>`;
  container.innerHTML = html;
}

function confermaPrenotazione() {
  mostraLoading(true);
  const prenotazioneData = {
    nomeCognome1: bookingData.autisti[0].nomeCognome,
    dataNascita1: bookingData.autisti[0].dataNascita,
    luogoNascita1: bookingData.autisti[0].luogoNascita,
    codiceFiscale1: bookingData.autisti[0].codiceFiscale,
    comuneResidenza1: bookingData.autisti[0].comuneResidenza,
    viaResidenza1: bookingData.autisti[0].viaResidenza,
    civicoResidenza1: bookingData.autisti[0].civicoResidenza,
    numeroPatente1: bookingData.autisti[0].numeroPatente,
    inizioValiditaPatente1: bookingData.autisti[0].dataInizioValiditaPatente,
    fineValiditaPatente1: bookingData.autisti[0].dataFineValiditaPatente,
    targaPulmino: bookingData.pulmino.targa,
    oraRitiro: bookingData.oraRitiro,
    oraArrivo: bookingData.oraArrivo,
    giornoRitiro: bookingData.dataRitiro,
    giornoArrivo: bookingData.dataArrivo,
    cellulare: bookingData.cellulare,
    dataContratto: new Date().toLocaleDateString('it-IT')
  };
  if (bookingData.autisti[1]) {
    prenotazioneData.nomeCognome2 = bookingData.autisti[1].nomeCognome;
    prenotazioneData.dataNascita2 = bookingData.autisti[1].dataNascita;
    prenotazioneData.luogoNascita2 = bookingData.autisti[1].luogoNascita;
    prenotazioneData.codiceFiscale2 = bookingData.autisti[1].codiceFiscale;
    prenotazioneData.comuneResidenza2 = bookingData.autisti[1].comuneResidenza;
    prenotazioneData.viaResidenza2 = bookingData.autisti[1].viaResidenza;
    prenotazioneData.civicoResidenza2 = bookingData.autisti[1].civicoResidenza;
    prenotazioneData.numeroPatente2 = bookingData.autisti[1].numeroPatente;
    prenotazioneData.inizioValiditaPatente2 = bookingData.autisti[1].dataInizioValiditaPatente;
    prenotazioneData.fineValiditaPatente2 = bookingData.autisti[1].dataFineValiditaPatente;
  }
  if (bookingData.autisti[2]) {
    prenotazioneData.nomeCognome3 = bookingData.autisti[2].nomeCognome;
    prenotazioneData.dataNascita3 = bookingData.autisti[2].dataNascita;
    prenotazioneData.luogoNascita3 = bookingData.autisti[2].luogoNascita;
    prenotazioneData.codiceFiscale3 = bookingData.autisti[2].codiceFiscale;
    prenotazioneData.comuneResidenza3 = bookingData.autisti[2].comuneResidenza;
    prenotazioneData.viaResidenza3 = bookingData.autisti[2].viaResidenza;
    prenotazioneData.civicoResidenza3 = bookingData.autisti[2].civicoResidenza;
    prenotazioneData.numeroPatente3 = bookingData.autisti[2].numeroPatente;
    prenotazioneData.inizioValiditaPatente3 = bookingData.autisti[2].dataInizioValiditaPatente;
    prenotazioneData.fineValiditaPatente3 = bookingData.autisti[2].dataFineValiditaPatente;
  }
  console.log('📤 Invio dati a Google Sheets:', prenotazioneData);
  fetch(SCRIPTS.proxy + SCRIPTS.salvaPrenotazione, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prenotazioneData)
  })
  .then(r => r.json())
  .then(result => {
    mostraLoading(false);
    console.log('📥 Risposta server:', result);
    if (result.success) {
      mostraSuccesso('Prenotazione salvata con successo!');
      setTimeout(() => mostraThankYou(), 1000);
    } else {
      mostraErrore('Errore durante il salvataggio: ' + (result.error || 'Errore sconosciuto'));
    }
  })
  .catch(err => {
    mostraLoading(false);
    console.error('❌ Errore connessione:', err);
    mostraErrore('Errore di connessione: ' + err.message);
  });
}

function mostraThankYou() {
  document.getElementById('mainbox').innerHTML = `<div id="thankyou" style="text-align: center; padding: 40px;"><span style="font-size: 80px;">🎉</span><h2 style="margin: 20px 0;">Prenotazione Confermata!</h2><p style="font-size: 18px; margin: 20px 0;">Grazie per aver scelto <strong>Imbriani Noleggio</strong></p><p style="color: var(--color-text-secondary); margin: 20px 0;">Riceverai una conferma via SMS al numero <strong>${bookingData.cellulare}</strong></p><div style="background: var(--color-secondary); padding: 20px; border-radius: 12px; margin: 30px 0;"><p style="margin: 0;"><strong>📋 Riepilogo:</strong></p><p style="margin: 8px 0; font-size: 16px;">${bookingData.pulmino.nome}</p><p style="margin: 5px 0;">🚗 Targa: <strong>${bookingData.pulmino.targa}</strong></p><p style="margin: 5px 0;">📅 Dal ${bookingData.dataRitiro} alle ${bookingData.oraRitiro}</p><p style="margin: 5px 0;">📅 Al ${bookingData.dataArrivo} alle ${bookingData.oraArrivo}</p><p style="margin: 5px 0;">📱 Contatto: <strong>${bookingData.cellulare}</strong></p></div><button onclick="location.reload()" class="btn btn--primary btn--lg" style="margin-top: 20px;">🏠 Torna alla Home</button></div>`;
}

function mostraModuliAutisti() {
  const container = document.getElementById('autisti_container');
  const num = parseInt(document.getElementById('num_autisti').value);
  container.innerHTML = '';
  for (let i = 1; i <= num; i++) {
    container.innerHTML += `<div class="autista"><h3>Autista ${i}</h3><label>Nome e Cognome *</label><input type="text" id="nome_cognome_${i}" placeholder="Mario Rossi" required /><label>Data di nascita *</label><div class="date-inline"><select id="giorno_nascita_${i}"></select><select id="mese_nascita_${i}"></select><select id="anno_nascita_${i}"></select></div><label>Luogo di nascita *</label><input type="text" id="luogo_nascita_${i}" placeholder="Roma" required /><label>Comune di residenza *</label><input type="text" id="comune_residenza_${i}" placeholder="Milano" required /><label>Via di residenza *</label><input type="text" id="via_residenza_${i}" placeholder="Via Roma" required /><label>Civico di residenza *</label><input type="text" id="civico_residenza_${i}" placeholder="123" required /><label>Codice fiscale *</label><input type="text" id="codice_fiscale_${i}" placeholder="RSSMRA80A01H501U" required maxlength="16" style="text-transform: uppercase;" /><label>Numero patente *</label><input type="text" id="numero_patente_${i}" placeholder="AB1234567C" required /><label>Data inizio validità patente *</label><div class="date-inline"><select id="giorno_inizio_validita_patente_${i}"></select><select id="mese_inizio_validita_patente_${i}"></select><select id="anno_inizio_validita_patente_${i}"></select></div><label>Data fine validità patente *</label><div class="date-inline"><select id="giorno_fine_validita_patente_${i}"></select><select id="mese_fine_validita_patente_${i}"></select><select id="anno_fine_validita_patente_${i}"></select></div></div>`;
  }
  const annoCorrente = new Date().getFullYear();
  for (let i = 1; i <= num; i++) {
    popolaTendineData(`giorno_nascita_${i}`, `mese_nascita_${i}`, `anno_nascita_${i}`, 1940, annoCorrente - 18);
    popolaTendineData(`giorno_inizio_validita_patente_${i}`, `mese_inizio_validita_patente_${i}`, `anno_inizio_validita_patente_${i}`, annoCorrente - 50, annoCorrente + 10);
    popolaTendineData(`giorno_fine_validita_patente_${i}`, `mese_fine_validita_patente_${i}`, `anno_fine_validita_patente_${i}`, annoCorrente, annoCorrente + 15);
  }
  if (loggedCustomerData && loggedCustomerData.datiCompleti) {
    setTimeout(() => {
      const dati = loggedCustomerData.datiCompleti;
      console.log('=== PRECOMPILAZIONE AUTISTA 1 + CELLULARE ===', dati);
      const nomeInput = document.getElementById('nome_cognome_1');
      if (nomeInput && dati.nomeCognome) nomeInput.value = dati.nomeCognome;
      if (dati.dataNascita) {
        const [gg, mm, aaaa] = dati.dataNascita.split('/');
        const selG = document.getElementById('giorno_nascita_1');
        const selM = document.getElementById('mese_nascita_1');
        const selA = document.getElementById('anno_nascita_1');
        if (selG && gg) selG.value = gg;
        if (selM && mm) selM.value = mm;
        if (selA && aaaa) selA.value = aaaa;
      }
      const luogoInput = document.getElementById('luogo_nascita_1');
      if (luogoInput && dati.luogoNascita) luogoInput.value = dati.luogoNascita;
      const cfInput = document.getElementById('codice_fiscale_1');
      if (cfInput && dati.codiceFiscale) cfInput.value = dati.codiceFiscale;
      const comuneInput = document.getElementById('comune_residenza_1');
      if (comuneInput && dati.comuneResidenza) comuneInput.value = dati.comuneResidenza;
      const viaInput = document.getElementById('via_residenza_1');
      if (viaInput && dati.viaResidenza) viaInput.value = dati.viaResidenza;
      const civicoInput = document.getElementById('civico_residenza_1');
      if (civicoInput && dati.civicoResidenza) civicoInput.value = dati.civicoResidenza;
      const patenteInput = document.getElementById('numero_patente_1');
      if (patenteInput && dati.numeroPatente) patenteInput.value = dati.numeroPatente;
      if (dati.dataInizioValiditaPatente) {
        const [gg, mm, aaaa] = dati.dataInizioValiditaPatente.split('/');
        const selG = document.getElementById('giorno_inizio_validita_patente_1');
        const selM = document.getElementById('mese_inizio_validita_patente_1');
        const selA = document.getElementById('anno_inizio_validita_patente_1');
        if (selG && gg) selG.value = gg;
        if (selM && mm) selM.value = mm;
        if (selA && aaaa) selA.value = aaaa;
      }
      if (dati.dataFineValiditaPatente) {
        const [gg, mm, aaaa] = dati.dataFineValiditaPatente.split('/');
        const selG = document.getElementById('giorno_fine_validita_patente_1');
        const selM = document.getElementById('mese_fine_validita_patente_1');
        const selA = document.getElementById('anno_fine_validita_patente_1');
        if (selG && gg) selG.value = gg;
        if (selM && mm) selM.value = mm;
        if (selA && aaaa) selA.value = aaaa;
      }
      const cellulareInput = document.getElementById('cellulare');
      if (cellulareInput && dati.cellulare) { cellulareInput.value = dati.cellulare; console.log('✅ Cellulare precompilato:', dati.cellulare); }
      mostraSuccesso('Dati del primo autista e cellulare precompilati automaticamente!');
    }, 150);
  }
}

function popolaTendineData(giornoId, meseId, annoId, annoStart, annoEnd) {
  const selG = document.getElementById(giornoId);
  const selM = document.getElementById(meseId);
  const selA = document.getElementById(annoId);
  if (!selG || !selM || !selA) return;
  selG.innerHTML = '<option value="">GG</option>';
  for (let i = 1; i <= 31; i++) selG.innerHTML += `<option value="${i.toString().padStart(2, '0')}">${i}</option>`;
  selM.innerHTML = '<option value="">MM</option>';
  for (let i = 1; i <= 12; i++) selM.innerHTML += `<option value="${i.toString().padStart(2, '0')}">${i}</option>`;
  selA.innerHTML = '<option value="">AAAA</option>';
  for (let i = annoEnd; i >= annoStart; i--) selA.innerHTML += `<option value="${i}">${i}</option>`;
}

window.onload = () => {
  const annoCorrente = new Date().getFullYear();
  popolaTendineData('giorno_ritiro', 'mese_ritiro', 'anno_ritiro', annoCorrente, annoCorrente + 1);
  popolaTendineData('giorno_arrivo', 'mese_arrivo', 'anno_arrivo', annoCorrente, annoCorrente + 1);
  mostraModuliAutisti();
  document.getElementById('num_autisti').addEventListener('change', mostraModuliAutisti);
  updateBackButton();
};
