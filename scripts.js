console.log('Imbriani Noleggio - Versione codice: 2.9.0 - Performance & UX Complete');

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
  datiCliente: 'https://script.google.com/macros/s/AKfycbxnC-JSK4YXv8GF6ED9uK3SSNYs3uAFAmyji6KB_eQ60QAqXIHbTM-18F7-Zu47bo/exec',
  disponibilita: 'https://script.google.com/macros/s/AKfycbwhEK3IH-hLGYpGXHRjcYdUaW2e3He485XpgcRVr0GBSyE4v4-gSCp5vnSCbn5ocNI/exec',
  salvaPrenotazione: 'https://script.google.com/macros/s/AKfycbwy7ZO3hCMcjhPuOMFyJoJl_IRyDr_wfhALadDhFt__Yjg3FBFWqt7wbCjIm0iim9Ya/exec'
};

const CONTATTO_PROPRIETARIO = '328 658 9618';

// Auto-save stato prenotazione
function salvaStatoTemporaneo() {
  if (!bookingData || Object.keys(bookingData).length === 0) return;
  try {
    sessionStorage.setItem('imbriani_booking_temp', JSON.stringify(bookingData));
    console.log('💾 Dati salvati temporaneamente');
  } catch (e) {
    console.error('Errore salvataggio temporaneo:', e);
  }
}

function caricaStatoTemporaneo() {
  try {
    const saved = sessionStorage.getItem('imbriani_booking_temp');
    if (saved) {
      bookingData = JSON.parse(saved);
      console.log('📂 Dati temporanei caricati');
      return true;
    }
  } catch (e) {
    console.error('Errore caricamento temporaneo:', e);
  }
  return false;
}

function cancellaStatoTemporaneo() {
  try {
    sessionStorage.removeItem('imbriani_booking_temp');
    console.log('🗑️ Dati temporanei cancellati');
  } catch (e) {
    console.error('Errore cancellazione temporanea:', e);
  }
}

function mostraErrore(msg) {
  const div = document.createElement('div');
  div.className = 'error-banner';
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 4000);
}

function mostraSuccesso(msg) {
  const div = document.createElement('div');
  div.className = 'success-banner';
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 4000);
}

function mostraLoading(show = true) {
  let loader = document.getElementById('globalLoader');
  if (show) {
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'globalLoader';
      loader.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center;
        z-index: 9999; backdrop-filter: blur(4px);
      `;
      loader.innerHTML = `
        <div style="text-align:center; color:white;">
          <div style="border:4px solid rgba(255,255,255,0.3); border-top:4px solid #fff;
            border-radius:50%; width:56px; height:56px; animation: spin 0.8s linear infinite; margin: 0 auto 20px;">
          </div>
          <p style="font-size:16px; font-weight:500;">Caricamento in corso...</p>
        </div>`;
      document.body.appendChild(loader);
    }
    loader.style.display = 'flex';
  } else if (loader) {
    loader.style.display = 'none';
  }
}

function validaCodiceFiscale(cf) {
  const regex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
  return regex.test(cf.toUpperCase());
}

function validaTelefono(tel) {
  const regex = /^[0-9]{10}$/;
  return regex.test(tel.replace(/\s/g, ''));
}

function validaNomeCognome(nomeCognome) {
  const regex = /^[A-Za-zÀ-ÿ'\-\s]{2,}\s[A-Za-zÀ-ÿ'\-\s]{2,}$/;
  if (!regex.test(nomeCognome.trim())) {
    return { valid: false, error: "Inserisci nome e cognome validi (min 2 caratteri ciascuno)" };
  }
  return { valid: true };
}

function validaCivico(civico) {
  const regex = /^\d{1,4}(\/[A-Za-z]|[A-Za-z]|\s?(bis|ter))?$/i;
  return regex.test(civico.trim());
}

function validaDataReale(gg, mm, aa) {
  const giorniMese = [31, (aa % 4 === 0 && (aa % 100 !== 0 || aa % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (gg < 1 || gg > giorniMese[mm - 1]) {
    return { valid: false, error: "Giorno non valido per questo mese" };
  }
  return { valid: true };
}

function nascondiIndicatoreProgresso() {
  const bar = document.getElementById('progress-indicator');
  if (bar) bar.remove();
}

function convertDateToIso(dataEuro) {
  let parts = dataEuro.split('/');
  if (parts.length !== 3) return '';
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function getData(prefix) {
  const gg = document.getElementById('giorno_' + prefix).value;
  const mm = document.getElementById('mese_' + prefix).value;
  const aa = document.getElementById('anno_' + prefix).value;
  return gg && mm && aa ? `${gg}/${mm}/${aa}` : '';
}

function showStep(stepId) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  const step = document.getElementById(stepId);
  if (step) step.classList.add('active');
  aggiornaIndicatoreProgresso(stepId);
}

function aggiornaIndicatoreProgresso(stepId) {
  let bar = document.getElementById('progress-indicator');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'progress-indicator';
    bar.style.cssText = 'position: fixed; top:0; left:0; width: 100%; height:6px;' +
      'background: #d3d3d3; z-index:10000;';
    document.body.appendChild(bar);
  }
  const stepsMap = { step1: 25, step2: 50, step3: 75, step4: 100 };
  bar.style.background = `linear-gradient(to right, #37b24d ${stepsMap[stepId] || 0}%, #d3d3d3 ${stepsMap[stepId] || 0}%)`;
}

function startNewBookingWithPreFill() {
  document.getElementById('homepage').style.display = 'none';
  document.getElementById('mainbox').style.display = 'flex';
  showStep('step1');
  bookingData = {};
  cancellaStatoTemporaneo();
  if (loggedCustomerData) {
    document.getElementById('num_autisti').value = '1';
    mostraModuliAutisti();
  }
}

function popolaTendineData(giornoId, meseId, annoId, annoStart, annoEnd) {
  const giorno = document.getElementById(giornoId);
  const mese = document.getElementById(meseId);
  const anno = document.getElementById(annoId);
  if (!giorno || !mese || !anno) return;
  giorno.innerHTML = '<option value="">GG</option>';
  for (let i=1; i<=31; i++) giorno.innerHTML += `<option>${i.toString().padStart(2,'0')}</option>`;
  mese.innerHTML = '<option value="">MM</option>';
  for (let i=1; i<=12; i++) mese.innerHTML += `<option>${i.toString().padStart(2,'0')}</option>`;
  anno.innerHTML = '<option value="">AAAA</option>';
  for (let i=annoEnd; i >= annoStart; i--) anno.innerHTML += `<option>${i}</option>`;
}

function mostraModuliAutisti() {
  const container = document.getElementById('autisti_container');
  const numAutisti = parseInt(document.getElementById('num_autisti').value);
  container.innerHTML = '';
  const annoCorrente = new Date().getFullYear();
  for (let i=1; i<=numAutisti; i++) {
    container.innerHTML += `
      <div class="autista">
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
        <input type="text" id="codice_fiscale_${i}" maxlength="16" placeholder="RSSMRA80A01H501U" required style="text-transform: uppercase;" />
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
        </div>
      </div>
    `;
    popolaTendineData(`giorno_nascita_${i}`, `mese_nascita_${i}`, `anno_nascita_${i}`, 1940, annoCorrente-18);
    popolaTendineData(`giorno_inizio_validita_patente_${i}`, `mese_inizio_validita_patente_${i}`, `anno_inizio_validita_patente_${i}`, annoCorrente-50, annoCorrente+10);
    popolaTendineData(`giorno_fine_validita_patente_${i}`, `mese_fine_validita_patente_${i}`, `anno_fine_validita_patente_${i}`, annoCorrente, annoCorrente+15);
  }
}

function controllaDisponibilita() {
  const dataRitiro = getData('ritiro');
  const oraRitiro = document.getElementById('ora_partenza').value;
  const dataArrivo = getData('arrivo');
  const oraArrivo = document.getElementById('ora_arrivo').value;

  if (!dataRitiro || !oraRitiro || !dataArrivo || !oraArrivo) {
    mostraErrore('Inserisci data e ora validi per ritiro e arrivo.');
    return;
  }

  const dateRitiro = new Date(convertDateToIso(dataRitiro) + 'T' + oraRitiro);
  const dateArrivo = new Date(convertDateToIso(dataArrivo) + 'T' + oraArrivo);

  if (dateRitiro >= dateArrivo) {
    mostraErrore('La data/ora di arrivo deve essere successiva a quella di ritiro.');
    return;
  }

  const domani = new Date();
  domani.setDate(domani.getDate() + 1);
  domani.setHours(0, 0, 0, 0);

  if (dateRitiro < domani) {
    mostraErrore('La data di ritiro deve essere almeno da domani in poi.');
    return;
  }

  bookingData.dataRitiro = dataRitiro;
  bookingData.oraRitiro = oraRitiro;
  bookingData.dataArrivo = dataArrivo;
  bookingData.oraArrivo = oraArrivo;

  salvaStatoTemporaneo();

  mostraLoading(true);
  fetch(SCRIPTS.proxy + SCRIPTS.disponibilita, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'getPrenotazioni' })
  })
    .then(res => res.json())
    .then(data => {
      mostraLoading(false);
      if (!data.success) {
        mostraErrore('Errore nel recupero delle prenotazioni: ' + (data.error || 'Errore sconosciuto'));
        return;
      }

      const prenotazioni = data.prenotazioni;
      const disponibili = pulmini.filter(p => {
        return !prenotazioni.some(pr => {
          if (pr.targa !== p.targa) return false;
          const inizio = new Date(pr.inizio);
          const fine = new Date(pr.fine);
          return !(fine < dateRitiro || inizio > dateArrivo);
        });
      });

      const select = document.getElementById('scelta_pulmino');
      select.innerHTML = '<option value="">-- Seleziona un pulmino --</option>' + disponibili.map(d => `<option value="${d.id}">${d.nome}</option>`).join('');
      document.getElementById('num_disponibili').textContent = disponibili.length;

      if (disponibili.length === 0) {
        mostraErrore('Nessun pulmino disponibile per la fascia selezionata!');
        return;
      }

      mostraSuccesso(`Trovati ${disponibili.length} pulmini disponibili!`);

      const btnContinua = document.getElementById('chiamaContinuaBtn');
      btnContinua.disabled = true;
      select.onchange = function () {
        btnContinua.disabled = !this.value;
        if (this.value) {
          bookingData.pulmino = pulmini.find(p => p.id === this.value);
          salvaStatoTemporaneo();
          mostraAvvisoContatto();
        }
      };

      showStep('step2');
    })
    .catch(err => {
      mostraLoading(false);
      mostraErrore('Errore durante il controllo disponibilità: ' + err.message);
    });
}

function mostraAvvisoContatto() {
  const existing = document.getElementById('contact-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'contact-banner';
  banner.style.cssText = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white; padding: 20px; border-radius: 12px; margin: 20px 0;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2); animation: slideIn 0.3s ease-out;
  `;
  banner.innerHTML = `
    <div style="display:flex; align-items:center; gap:16px;">
      <span style="font-size:48px;">📞</span>
      <div style="flex:1;">
        <h3 style="margin:0 0 8px 0; font-size:18px; font-weight:600;">Prima di continuare</h3>
        <p style="margin:0 0 12px 0; font-size:14px; opacity:0.9;">
          Contatta il proprietario per concordare il prezzo del noleggio
        </p>
        <a href="tel:${CONTATTO_PROPRIETARIO.replace(/\s/g, '')}" 
           style="display: inline-flex; align-items:center; gap:8px; background: white; color:#667eea; padding:10px 20px; border-radius:8px; text-decoration:none; font-weight:600; font-size:16px; transition: transform 0.2s;">
          <span class="material-icons" style="font-size:20px;">phone</span>${CONTATTO_PROPRIETARIO}
        </a>
      </div>
    </div>
  `;

  const step2 = document.getElementById('step2');
  const selectContainer = step2.querySelector('#scelta_pulmino').parentElement;
  selectContainer.parentNode.insertBefore(banner, selectContainer.nextSibling);
}

function vaiStep3() {
  showStep('step3');
  mostraModuliAutisti();
}

function vaiStep4() {
  const numAutisti = parseInt(document.getElementById('num_autisti').value);
  const cellulare = document.getElementById('cellulare').value.trim();

  if (!validaTelefono(cellulare)) {
    mostraErrore('Inserisci un numero di cellulare valido (10 cifre)');
    return;
  }

  const duplicati = verificaDuplicatiCF();
  if (!duplicati.valid) {
    mostraErrore(`Codice fiscale duplicato: ${duplicati.duplicato}. Ogni autista deve avere un CF univoco.`);
    return;
  }

  for (let i = 1; i <= numAutisti; i++) {
    const nomeCognome = document.getElementById(`nome_cognome_${i}`).value.trim();
    const dataNascita = getDataAutista('nascita', i);
    const luogoNascita = document.getElementById(`luogo_nascita_${i}`).value.trim();
    const comuneResidenza = document.getElementById(`comune_residenza_${i}`).value.trim();
    const viaResidenza = document.getElementById(`via_residenza_${i}`).value.trim();
    const civicoResidenza = document.getElementById(`civico_residenza_${i}`).value.trim();
    const codiceFiscale = document.getElementById(`codice_fiscale_${i}`).value.trim().toUpperCase();
    const numeroPatente = document.getElementById(`numero_patente_${i}`).value.trim();
    const dataInizioPatente = getDataAutista('inizio_validita_patente', i);
    const dataFinePatente = getDataAutista('fine_validita_patente', i);

    if (!nomeCognome || !dataNascita || !luogoNascita || !comuneResidenza || !viaResidenza || !civicoResidenza || !numeroPatente || !dataInizioPatente || !dataFinePatente) {
      mostraErrore(`Compila tutti i campi obbligatori per l'autista ${i}`);
      return;
    }

    const nomeCheck = validaNomeCognome(nomeCognome);
    if (!nomeCheck.valid) {
      mostraErrore(`Autista ${i}: ${nomeCheck.error}`);
      return;
    }
    if (!validaCivico(civicoResidenza)) {
      mostraErrore(`Civico non valido per l'autista ${i} (es: 12, 12A, 12/A)`);
      return;
    }
    if (!validaCodiceFiscale(codiceFiscale)) {
      mostraErrore(`Codice fiscale non valido per l'autista ${i}`);
      return;
    }

    const [ggN, mmN, aaN] = dataNascita.split('/').map(Number);
    const dataCheck = validaDataReale(ggN, mmN, aaN);
    if (!dataCheck.valid) {
      mostraErrore(`Data di nascita autista ${i}: ${dataCheck.error}`);
      return;
    }

    const inizioPatente = new Date(convertDateToIso(dataInizioPatente));
    const finePatente = new Date(convertDateToIso(dataFinePatente));
    const oggi = new Date();

    if (finePatente < oggi) {
      mostraErrore(`La patente dell'autista ${i} è scaduta!`);
      return;
    }

    if (inizioPatente >= finePatente) {
      mostraErrore(`Le date della patente dell'autista ${i} non sono valide`);
      return;
    }

    const nascita = new Date(convertDateToIso(dataNascita));
    const eta = Math.floor((oggi - nascita) / (365.25 * 24 * 60 * 60 * 1000));
    if (eta < 18) {
      mostraErrore(`L'autista ${i} deve avere almeno 18 anni`);
      return;
    }
    if (eta > 100) {
      mostraErrore(`Verifica la data di nascita dell'autista ${i}`);
      return;
    }
  }

  bookingData.numAutisti = numAutisti;
  bookingData.cellulare = cellulare;
  bookingData.autisti = [];
  for (let i=1; i<=numAutisti; i++) {
    bookingData.autisti.push({
      nomeCognome: document.getElementById(`nome_cognome_${i}`).value.trim(),
      dataNascita: getDataAutista('nascita', i),
      luogoNascita: document.getElementById(`luogo_nascita_${i}`).value.trim(),
      comuneResidenza: document.getElementById(`comune_residenza_${i}`).value.trim(),
      viaResidenza: document.getElementById(`via_residenza_${i}`).value.trim(),
      civicoResidenza: document.getElementById(`civico_residenza_${i}`).value.trim(),
      codiceFiscale: document.getElementById(`codice_fiscale_${i}`).value.trim().toUpperCase(),
      numeroPatente: document.getElementById(`numero_patente_${i}`).value.trim(),
      dataInizioValiditaPatente: getDataAutista('inizio_validita_patente', i),
      dataFineValiditaPatente: getDataAutista('fine_validita_patente', i)
    });
  }
  salvaStatoTemporaneo();
  mostraSuccesso('Dati validati con successo!');
  mostraRiepilogo();
  showStep('step4');
}

function getDataAutista(tipo, i) {
  const gg = document.getElementById(`giorno_${tipo}_${i}`).value;
  const mm = document.getElementById(`mese_${tipo}_${i}`).value;
  const aa = document.getElementById(`anno_${tipo}_${i}`).value;
  return gg && mm && aa ? `${gg}/${mm}/${aa}` : '';
}

function verificaDuplicatiCF() {
  const numAutisti = parseInt(document.getElementById('num_autisti').value);
  const cfList = [];
  for (let i=1; i<=numAutisti; i++) {
    const cf = document.getElementById(`codice_fiscale_${i}`).value.trim().toUpperCase();
    if (cf && cfList.includes(cf)) {
      return { valid: false, duplicato: cf };
    }
    if (cf) cfList.push(cf);
  }
  return { valid: true };
}

function mostraRiepilogo() {
  const container = document.getElementById('riepilogo_container');
  if (!container) return;
  let html = '<div class="riepilogo">';
  html += `<div class="riepilogo-section"><h3>📋 Dettagli Prenotazione</h3><div class="riepilogo-grid"><div class="riepilogo-item"><span class="riepilogo-label">Pulmino:</span><span class="riepilogo-value">${bookingData.pulmino.nome} (${bookingData.pulmino.targa})</span></div><div class="riepilogo-item"><span class="riepilogo-label">Ritiro:</span><span class="riepilogo-value">${bookingData.dataRitiro} alle ${bookingData.oraRitiro}</span></div><div class="riepilogo-item"><span class="riepilogo-label">Riconsegna:</span><span class="riepilogo-value">${bookingData.dataArrivo} alle ${bookingData.oraArrivo}</span></div><div class="riepilogo-item"><span class="riepilogo-label">Cellulare di riferimento:</span><span class="riepilogo-value">${bookingData.cellulare}</span></div></div></div>`;

  bookingData.autisti.forEach((autista, index) => {
    html += `<div class="riepilogo-section"><h3>👤 Autista ${index+1}</h3><div class="riepilogo-grid"><div class="riepilogo-item"><span class="riepilogo-label">Nome e Cognome:</span><span class="riepilogo-value">${autista.nomeCognome}</span></div><div class="riepilogo-item"><span class="riepilogo-label">Data di nascita:</span><span class="riepilogo-value">${autista.dataNascita}</span></div><div class="riepilogo-item"><span class="riepilogo-label">Luogo di nascita:</span><span class="riepilogo-value">${autista.luogoNascita}</span></div><div class="riepilogo-item"><span class="riepilogo-label">Codice Fiscale:</span><span class="riepilogo-value">${autista.codiceFiscale}</span></div><div class="riepilogo-item"><span class="riepilogo-label">Residenza:</span><span class="riepilogo-value">${autista.viaResidenza} ${autista.civicoResidenza}, ${autista.comuneResidenza}</span></div><div class="riepilogo-item"><span class="riepilogo-label">Patente:</span><span class="riepilogo-value">${autista.numeroPatente}</span></div><div class="riepilogo-item"><span class="riepilogo-label">Validità patente:</span><span class="riepilogo-value">Dal ${autista.dataInizioValiditaPatente} al ${autista.dataFineValiditaPatente}</span></div></div></div>`;
  });

  html += `<div class="riepilogo-actions"><button onclick="confermaPrenotazione()" class="btn btn-main btn-lg btn-fullwidth">✅ Conferma e Invia Prenotazione</button><p style="text-align:center; margin-top:12px; font-size:13px; color:#2c5d2a;">Verifica attentamente i dati prima di confermare</p></div></div>`;

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

  fetch(SCRIPTS.proxy + SCRIPTS.salvaPrenotazione, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prenotazioneData)
  })
    .then(res => res.json())
    .then(result => {
      mostraLoading(false);
      if (result.success) {
        cancellaStatoTemporaneo();
        mostraSuccesso('Prenotazione salvata con successo!');
        setTimeout(mostraThankYou, 1000);
      } else {
        mostraErrore('Errore durante il salvataggio: ' + (result.error || 'Errore sconosciuto'));
      }
    })
    .catch(err => {
      mostraLoading(false);
      mostraErrore('Errore di connessione: ' + err.message);
    });
}

function mostraThankYou() {
  nascondiIndicatoreProgresso();
  document.getElementById('mainbox').innerHTML = `
    <div id="thankyou" style="text-align:center; padding:40px;">
      <span style="font-size:80px;">🎉</span>
      <h2 style="margin:20px 0;">Prenotazione Confermata!</h2>
      <p style="font-size:18px; margin:20px 0;">
        Grazie per aver scelto <strong>Imbriani Noleggio</strong>
      </p>
      <button onclick="location.reload()" class="btn btn-main btn-lg" style="margin-top:20px;">
        <span class="material-icons">home</span> Torna alla Home
      </button>
    </div>`;
}

window.onload = () => {
  const annoCorrente = new Date().getFullYear();
  popolaTendineData('giorno_ritiro', 'mese_ritiro', 'anno_ritiro', annoCorrente, annoCorrente + 1);
  popolaTendineData('giorno_arrivo', 'mese_arrivo', 'anno_arrivo', annoCorrente, annoCorrente + 1);
  mostraModuliAutisti();
  document.getElementById('num_autisti').addEventListener('change', mostraModuliAutisti);
};

document.getElementById('loginFormHomepage').addEventListener('submit', function (e) {
  e.preventDefault();
  const cf = document.getElementById('cfInputHomepage').value.trim().toUpperCase();
  if (!validaCodiceFiscale(cf)) {
    mostraErrore('Codice fiscale non valido. Deve essere di 16 caratteri (es: RSSMRA80A01H501U)');
    return;
  }
  mostraLoading(true);
  Promise.all([
    fetch(SCRIPTS.proxy + SCRIPTS.prenotazioni, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cf })
    }).then(r => r.text()).then(t => JSON.parse(t)),
    fetch(SCRIPTS.proxy + SCRIPTS.datiCliente, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cf })
    }).then(r => r.text()).then(t => JSON.parse(t))
  ]).then(([dataPrenotazioni, dataDatiCliente]) => {
    mostraLoading(false);
    if (!dataPrenotazioni.success) {
      mostraErrore('Errore nel recupero prenotazioni: ' + (dataPrenotazioni.error || 'Errore non specificato'));
      return;
    }
    if (!dataPrenotazioni.prenotazioni || dataPrenotazioni.prenotazioni.length === 0) {
      mostraErrore('Nessuna prenotazione trovata per questo codice fiscale.');
      return;
    }
    loggedCustomerData = { cf, datiCompleti: dataDatiCliente.success ? dataDatiCliente.cliente : null };
    mostraSuccesso(`Benvenuto! Trovate ${dataPrenotazioni.prenotazioni.length} prenotazioni.`);
    let htmlPren = `<div class="prenotazioni-container"><h3>Le tue prenotazioni:</h3>`;
    dataPrenotazioni.prenotazioni.forEach(item => {
      let statoClass = '';
      if (item.stato === 'Prenotato') statoClass = 'status--info';
      else if (item.stato === 'In corso') statoClass = 'status--warning';
      else if (item.stato === 'Completato') statoClass = 'status--success';
      htmlPren += `<div class="card prenotazione-card">
                      <div class="card__body">
                        <div class="prenotazione-header">
                          <span class="material-icons">directions_bus</span>
                          <strong>${item.targa || 'N/D'}</strong>
                        </div>
                        <div class="prenotazione-date">
                          <div class="date-item"><span class="material-icons">event</span><span><b>Dal:</b> ${item.dal || 'N/D'}</span></div>
                          <div class="date-item"><span class="material-icons">event</span><span><b>Al:</b> ${item.al || 'N/D'}</span></div>
                        </div>
                        <div class="prenotazione-stato"><span class="status ${statoClass}">${item.stato || 'N/D'}</span></div>
                      </div>
                    </div>`;
    });
    htmlPren += `</div><button id="btnNewBookingFromLogin" class="btn btn-main"><span class="material-icons">add</span> Prenota un nuovo noleggio</button>`;
    document.getElementById('loginResultHomepage').innerHTML = htmlPren;
    document.getElementById('btnNewBookingFromLogin').addEventListener('click', () => startNewBookingWithPreFill());
  }).catch(err => {
    mostraLoading(false);
    mostraErrore('Errore durante la ricerca: ' + err.message);
  });
});

document.getElementById('btnNewBooking').addEventListener('click', () => {
  loggedCustomerData = null;
  startNewBookingWithPreFill();
});
