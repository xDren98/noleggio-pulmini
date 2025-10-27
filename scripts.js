console.log('Imbriani Noleggio - Versione codice: 2.5.2');

const pulmini = [
  { id: "ducato_lungo", nome: "Fiat Ducato (Passo lungo)", targa: "EC787NM" },
  { id: "ducato_corto", nome: "Fiat Ducato (Passo corto)", targa: "DN391FW" },
  { id: "peugeot", nome: "Peugeot Expert Tepee", targa: "DL291XZ" }
];

let loggedCustomerData = null;
let bookingData = {};

const SCRIPTS = {
  proxy: 'https://proxy-cors-google-apps.onrender.com/',
  datiCliente: 'https://script.google.com/macros/s/AKfycbxnC-JSK4YXvV8GF6ED9uK3SSNYs3uAFAmyji6KB_eQ60QAqXIHbTM-18F7-Zu47bo/exec',
  disponibilita: 'https://script.google.com/macros/s/AKfycbwhEK3IH-hLGYpGXHRjcYdUaW2e3He485XpgcRVr0GBSyE4v4-gSCp5vnSCbn5ocNI/exec',
  prenotazioni: 'https://script.google.com/macros/s/AKfycbyMPuvESaAJ7bIraipTya9yUKnyV8eYbm-r8CX42KRvDQsX0f44QBsaqQOY8KVYFBE/exec',
  manageBooking: 'https://script.google.com/macros/s/AKfycbxAKX12Sgc0ODvGtUEXCRoINheSeO9-SgDNGuY1QtrVKBENdY0SpMiDtzgoxIBRCuQ/exec'
};

function fetchWithProxy(url, options = {}) {
  return fetch(SCRIPTS.proxy + url, options);
}

function validaCodiceFiscale(cf) {
  const regex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
  return regex.test(cf.toUpperCase());
}

function mostraErrore(messaggio) {
  if (document.querySelector('.error-banner')) return;
  const div = document.createElement('div');
  div.className = 'error-banner';
  div.innerHTML = `<span style="font-size: 24px;">⚠️</span><span>${messaggio}</span>`;
  document.body.prepend(div);
  setTimeout(() => div.remove(), 4000);
}

function mostraSuccesso(messaggio) {
  if (document.querySelector('.success-banner')) return;
  const div = document.createElement('div');
  div.className = 'success-banner';
  div.innerHTML = `<span style="font-size: 24px;">✅</span><span>${messaggio}</span>`;
  document.body.prepend(div);
  setTimeout(() => div.remove(), 4000);
}

function mostraLoading(show = true) {
  let loader = document.getElementById('globalLoader');
  if (show) {
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'globalLoader';
      loader.className = 'loader-overlay';
      loader.innerHTML = `
        <div class="loader-spinner">
          <div class="spinner"></div>
          <p>Caricamento in corso...</p>
        </div>`;
      document.body.appendChild(loader);
    }
    loader.style.display = 'flex';
  } else {
    if (loader) loader.style.display = 'none';
  }
}

// LOGIN E AREA PERSONALE

document.getElementById('loginFormHomepage').addEventListener('submit', function(event) {
  event.preventDefault();
  console.log("Submit login form triggered");
  const cf = document.getElementById('cfInputHomepage').value.trim().toUpperCase();
  console.log("CF inserito:", cf);
  const loginResult = document.getElementById('loginResultHomepage');
  loginResult.textContent = '';

  if (!validaCodiceFiscale(cf)) {
    mostraErrore('Codice fiscale non valido.');
    return;
  }

  mostraLoading(true);
  Promise.all([
    fetchWithProxy(SCRIPTS.prenotazioni, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cf }),
    }).then(r => r.json()),
    fetchWithProxy(SCRIPTS.datiCliente, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cf }),
    }).then(r => r.json())
  ]).then(([resultPren, resultCliente]) => {
    console.log("Risposta prenotazioni:", resultPren);
    console.log("Risposta dati cliente:", resultCliente);
    mostraLoading(false);
    if (!resultPren.success || !resultPren.prenotazioni) {
      mostraErrore('Nessuna prenotazione trovata.');
      return;
    }
    loggedCustomerData = {
      cf: cf,
      datiCompleti: resultCliente.success ? resultCliente.cliente : null
    };
    setupAreaPersonale();
    // Mostra subito le prenotazioni dopo login
    caricaPrenotazioniCliente(loggedCustomerData.cf);
    // Mostra area personale, nasconde homepage
    document.getElementById('areaPersonale').style.display = 'block';
    document.getElementById('homepage').style.display = 'none';
  }).catch(err => {
    mostraLoading(false);
    mostraErrore('Errore: ' + err.message);
  });
});

function setupAreaPersonale() {
  document.getElementById('btnVisualizzaPrenotazioni').onclick = () => {
    caricaPrenotazioniCliente(loggedCustomerData.cf);
  };
  document.getElementById('btnVisualizzaDati').onclick = () => {
    mostraDatiCliente(loggedCustomerData.datiCompleti);
  };
  document.getElementById('btnLogout').onclick = () => {
    loggedCustomerData = null;
    document.getElementById('areaPersonale').style.display = 'none';
    document.getElementById('homepage').style.display = 'block';
    document.getElementById('contenutoPersonale').innerHTML = '';
  };
}

// CARICAMENTO PRENOTAZIONI E DATI

function caricaPrenotazioniCliente(cf) {
  mostraLoading(true);
  fetchWithProxy(SCRIPTS.prenotazioni, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cf }),
  })
  .then(response => response.json())
  .then(data => {
    console.log("Dati prenotazioni ricevuti dal backend:", data);
    mostraLoading(false);

    if (!data.success) {
      mostraErrore('Errore nel recupero prenotazioni: ' + (data.error || 'Errore sconosciuto'));
      document.getElementById('contenutoPersonale').innerHTML = '';
      return;
    }

    if (!data.prenotazioni || !Array.isArray(data.prenotazioni)) {
      mostraErrore('Formato dati prenotazioni non valido.');
      document.getElementById('contenutoPersonale').innerHTML = '';
      return;
    }

    if (data.prenotazioni.length === 0) {
      mostraErrore('Nessuna prenotazione trovata.');
      document.getElementById('contenutoPersonale').innerHTML = '<p>Nessuna prenotazione trovata.</p>';
      return;
    }

    let html = '<h3>Le tue prenotazioni</h3>';
    for (const p of data.prenotazioni) {
      const nome = p.Nome || p.nomeCognome || 'N/D';
      const inizio = p['Giorno inizio noleggio'] || 'N/D';
      const fine = p['Giorno fine noleggio'] || 'N/D';
      const stato = p.stato || 'N/D';
      const targa = p.targa || 'N/D';

      html += `
        <div class="prenotazione-card">
          <strong>${nome}</strong><br/>
          Dal: ${inizio} - Al: ${fine}<br/>
          Stato: ${stato}<br/>
          Targa: ${targa}
          <div style="margin-top:10px;">
            <button onclick='modificaPrenotazione(${JSON.stringify(p)})'>Modifica</button>
            <button onclick='cancellaPrenotazione(${JSON.stringify(p)})'>Cancella</button>
          </div>
        </div>
      `;
    }
    document.getElementById('contenutoPersonale').innerHTML = html;
  })
  .catch(err => {
    mostraLoading(false);
    mostraErrore('Errore caricamento prenotazioni: ' + err.message);
    document.getElementById('contenutoPersonale').innerHTML = '';
  });
}

function mostraDatiCliente(dati) {
  if (!dati) {
    document.getElementById('contenutoPersonale').innerHTML = '<p>Dati cliente non disponibili.</p>';
    return;
  }
  const html = `
    <h3>I tuoi dati</h3>
    <p><strong>Nome e Cognome:</strong> ${dati.nomeCognome}</p>
    <p><strong>Data di Nascita:</strong> ${dati.dataNascita}</p>
    <p><strong>Codice Fiscale:</strong> ${dati.codiceFiscale}</p>
    <p><strong>Numero Patente:</strong> ${dati.numeroPatente}</p>
    <p><strong>Validità Patente:</strong> dal ${dati.dataInizioValiditaPatente} al ${dati.dataFineValiditaPatente}</p>
    <p><strong>Cellulare:</strong> ${dati.cellulare}</p>
  `;
  document.getElementById('contenutoPersonale').innerHTML = html;
}

// MODIFICA PRENOTAZIONE

function modificaPrenotazione(p) {
  if (typeof p === 'string') p = JSON.parse(p);
  const nome = p.Nome || p.nomeCognome || '';
  const dataNascita = p['Data di nascita'] || '';
  const luogoNascita = p['Luogo di nascita'] || '';
  const numeroPatente = p['Numero di patente'] || '';
  const dataInizioPatente = p['Data inizio validità patente'] || '';
  const dataFinePatente = p['Scadenza patente'] || '';
  const oraInizio = p['Ora inizio noleggio'] || '';
  const oraFine = p['Ora fine noleggio'] || '';

  const formHtml = `
    <h3>Modifica prenotazione</h3>
    <form id="formModificaPrenotazione">
      <label>Nome <input type="text" name="Nome" value="${nome}" required></label>
      <label>Data di nascita <input type="text" name="Data di nascita" value="${dataNascita}" required></label>
      <label>Luogo di nascita <input type="text" name="Luogo di nascita" value="${luogoNascita}" required></label>
      <label>Numero di patente <input type="text" name="Numero di patente" value="${numeroPatente}" required></label>
      <label>Data inizio validità patente <input type="text" name="Data inizio validità patente" value="${dataInizioPatente}" required></label>
      <label>Scadenza patente <input type="text" name="Scadenza patente" value="${dataFinePatente}" required></label>
      <label>Ora inizio noleggio <input type="text" name="Ora inizio noleggio" value="${oraInizio}" required></label>
      <label>Ora fine noleggio <input type="text" name="Ora fine noleggio" value="${oraFine}" required></label>
      <input type="hidden" name="idPrenotazione" value="${p['ID prenotazione']}">
      <button type="submit">Aggiorna</button>
    </form>`;
  document.getElementById('contenutoPersonale').innerHTML = formHtml;
  document.getElementById('formModificaPrenotazione').onsubmit = function(e) {
    e.preventDefault();
    const data = {};
    new FormData(this).forEach((v, k) => data[k] = v);
    fetchWithProxy(SCRIPTS.manageBooking, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.text()).then(msg => {
      mostraSuccesso(msg);
      caricaPrenotazioniCliente(loggedCustomerData.cf);
    }).catch(err => mostraErrore('Errore: ' + err.message));
  };
}

// CANCELLA PRENOTAZIONE
function cancellaPrenotazione(p) {
  if (typeof p === 'string') p = JSON.parse(p);
  const idPrenotazione = p['ID prenotazione'];
  console.log('Cancella -> ID:', idPrenotazione);
  if (!idPrenotazione) { mostraErrore('ID prenotazione mancante'); return; }
  if (!confirm('Sei sicuro di voler cancellare questa prenotazione?')) return;

  mostraLoading(true);
  fetchWithProxy(SCRIPTS.manageBooking, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idPrenotazione, delete: true }),
  })
  .then(r => r.json())
  .then(result => {
    mostraLoading(false);
    console.log('Risposta cancellazione:', result);
    if (result.success) {
      mostraSuccesso(result.message || 'Prenotazione cancellata');
      caricaPrenotazioniCliente(loggedCustomerData.cf);
    } else {
      mostraErrore('Errore: ' + (result.error || 'Cancellazione fallita'));
    }
  })
  .catch(err => {
    mostraLoading(false);
    console.error('Errore cancellazione:', err);
    mostraErrore('Errore: ' + err.message);
  });
}



// Le restanti funzioni continuano come da codice originale (startNewBookingWithPreFill, showStep, updateBackButton, goBack, etc.)


document.getElementById('btnNewBooking').addEventListener('click', () => {
  loggedCustomerData = null;
  startNewBookingWithPreFill();
});

function startNewBookingWithPreFill() {
  document.getElementById('homepage').style.display = 'none';
  const mainbox = document.getElementById('mainbox');
  mainbox.style.display = 'flex';
  showStep('step1');
  bookingData = {};
  if (loggedCustomerData) {
    document.getElementById('num_autisti').value = '1';
    mostraModuliAutisti();
  }
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
    if (mainbox) {
      mainbox.insertBefore(backBtn, mainbox.firstChild);
    }
  }
  if (document.getElementById('step1').classList.contains('active') || 
      document.getElementById('homepage').style.display !== 'none') {
    backBtn.style.display = 'none';
  } else {
    backBtn.style.display = 'flex';
  }
}

function goBack() {
  if (document.getElementById('step4').classList.contains('active')) {
    showStep('step3');
  } else if (document.getElementById('step3').classList.contains('active')) {
    showStep('step2');
  } else if (document.getElementById('step2').classList.contains('active')) {
    showStep('step1');
  } else {
    document.getElementById('mainbox').style.display = 'none';
    document.getElementById('homepage').style.display = 'block';
    document.getElementById('loginResultHomepage').innerHTML = '';
  }
}

function controllaDisponibilita() {
  const dataRitiroStr = getData('ritiro');
  const oraRitiro = document.getElementById('ora_partenza').value;
  const dataArrivoStr = getData('arrivo');
  const oraArrivo = document.getElementById('ora_arrivo').value;

  if (!dataRitiroStr || !oraRitiro || !dataArrivoStr || !oraArrivo) {
    mostraErrore('Inserisci data e ora validi per ritiro e arrivo.');
    return;
  }

  const dateRitiro = new Date(`${dataRitiroStr.split('/')[2]}-${dataRitiroStr.split('/')[1]}-${dataRitiroStr.split('/')[0]}T${oraRitiro}`);
  const dateArrivo = new Date(`${dataArrivoStr.split('/')[2]}-${dataArrivoStr.split('/')[1]}-${dataArrivoStr.split('/')[0]}T${oraArrivo}`);

  if (dateRitiro >= dateArrivo) {
    mostraErrore("La data/ora di arrivo deve essere successiva a quella di ritiro.");
    return;
  }

  const domani = new Date();
  domani.setDate(domani.getDate() + 1);
  domani.setHours(0, 0, 0, 0);
  
  if (dateRitiro < domani) {
    mostraErrore("La data di ritiro deve essere almeno da domani in poi.");
    return;
  }

  bookingData.dataRitiro = dataRitiroStr;
  bookingData.oraRitiro = oraRitiro;
  bookingData.dataArrivo = dataArrivoStr;
  bookingData.oraArrivo = oraArrivo;

  mostraLoading(true);

  fetch(SCRIPTS.proxy + SCRIPTS.disponibilita, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'getPrenotazioni' })
  })
  .then(response => response.json())
  .then(data => {
    mostraLoading(false);
    
    if (!data.success) {
      mostraErrore('Errore nel recupero delle prenotazioni: ' + (data.error || 'Errore sconosciuto'));
      return;
    }

    const arrayPrenotazioni = data.prenotazioni;
    const disponibili = pulmini.filter(p => {
      return !arrayPrenotazioni.some(pren => {
        if (pren.targa !== p.targa) return false;
        const inizio = new Date(pren.inizio);
        const fine = new Date(pren.fine);
        return !(fine <= dateRitiro || inizio >= dateArrivo);
      });
    });

    const select = document.getElementById('scelta_pulmino');
    if (!select) return;
    select.innerHTML = '<option value="">-- Seleziona un pulmino --</option>' + disponibili.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
    document.getElementById('num_disponibili').textContent = disponibili.length;

    if (disponibili.length === 0) {
      mostraErrore('Nessun pulmino disponibile per la fascia selezionata!');
      return;
    }
    
    mostraSuccesso(`Trovati ${disponibili.length} pulmini disponibili!`);
    showStep('step2');
    
    const continuaBtn = document.getElementById('chiamaContinuaBtn');
    continuaBtn.disabled = true;

    select.addEventListener('change', function () {
      continuaBtn.disabled = !this.value;
      if (this.value) {
        bookingData.pulmino = pulmini.find(p => p.id === this.value);
      }
    });
  })
  .catch(err => {
    mostraLoading(false);
    mostraErrore('Errore durante il controllo disponibilità: ' + err.message);
  });
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

    if (!nomeCognome || !dataNascita || !luogoNascita || !comuneResidenza || 
        !viaResidenza || !civicoResidenza || !numeroPatente || 
        !dataInizioValiditaPatente || !dataFineValiditaPatente) {
      mostraErrore(`Compila tutti i campi obbligatori per l'autista ${i}`);
      return;
    }

    if (!validaCodiceFiscale(codiceFiscale)) {
      mostraErrore(`Codice fiscale non valido per l'autista ${i}`);
      return;
    }

    if (nomeCognome.split(' ').length < 2) {
      mostraErrore(`Inserisci nome e cognome completi per l'autista ${i}`);
      return;
    }

    const inizioPatente = new Date(convertDateToIso(dataInizioValiditaPatente));
    const finePatente = new Date(convertDateToIso(dataFineValiditaPatente));
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

  for (let i = 1; i <= numAutisti; i++) {
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

  mostraSuccesso('Dati validati con successo!');
  showStep('step4');
  mostraRiepilogoPrenotazione();
}

function mostraRiepilogoPrenotazione() {
  const container = document.getElementById('riepilogo_container');
  if (!container) return;

  let html = `
    <div class="riepilogo">
      <div class="riepilogo-section">
        <h3><span class="material-icons" style="vertical-align:middle;color:#37b24d;margin-right:4px;">directions_bus</span> Dati Prenotazione</h3>
        <div class="riepilogo-grid">
          <div class="riepilogo-item"><span class="riepilogo-label">Pulmino:</span> <span class="riepilogo-value">${bookingData.pulmino?.nome || '-'}</span></div>
          <div class="riepilogo-item"><span class="riepilogo-label">Targa:</span> <span class="riepilogo-value">${bookingData.pulmino?.targa || '-'}</span></div>
          <div class="riepilogo-item"><span class="riepilogo-label">Dal:</span> <span class="riepilogo-value">${bookingData.dataRitiro || '-'}</span></div>
          <div class="riepilogo-item"><span class="riepilogo-label">Ora ritiro:</span> <span class="riepilogo-value">${bookingData.oraRitiro || '-'}</span></div>
          <div class="riepilogo-item"><span class="riepilogo-label">Al:</span> <span class="riepilogo-value">${bookingData.dataArrivo || '-'}</span></div>
          <div class="riepilogo-item"><span class="riepilogo-label">Ora arrivo:</span> <span class="riepilogo-value">${bookingData.oraArrivo || '-'}</span></div>
          <div class="riepilogo-item"><span class="riepilogo-label">Telefono:</span> <span class="riepilogo-value">${bookingData.cellulare || '-'}</span></div>
        </div>
      </div>
      <div class="riepilogo-section">
        <h3><span class="material-icons" style="vertical-align:middle;color:#37b24d;margin-right:4px;">person</span> Autista/i</h3>
        <div class="riepilogo-autisti">`;

  bookingData.autisti.forEach((autista, idx) => {
    html += `
      <div class="riepilogo-autista">
        <strong>Autista ${idx + 1}</strong><br/>
        <span class="riepilogo-label">Nome:</span> <span class="riepilogo-value">${autista.nomeCognome}</span><br/>
        <span class="riepilogo-label">Nascita:</span> <span class="riepilogo-value">${autista.dataNascita} - ${autista.luogoNascita}</span><br/>
        <span class="riepilogo-label">Codice Fiscale:</span> <span class="riepilogo-value">${autista.codiceFiscale}</span><br/>
        <span class="riepilogo-label">Residenza:</span> <span class="riepilogo-value">${autista.comuneResidenza}, ${autista.viaResidenza} ${autista.civicoResidenza}</span><br/>
        <span class="riepilogo-label">Patente:</span> <span class="riepilogo-value">${autista.numeroPatente} (${autista.dataInizioValiditaPatente} - ${autista.dataFineValiditaPatente})</span>
      </div>`;
  });

  html += `
        </div>
        <div class="riepilogo-actions" style="text-align:center; margin-top:24px;">
          <button id="btnConfermaPrenotazione" class="btn btn--primary" style="padding:14px 38px;font-size:1.15em;">
            <span class="material-icons" style="font-size:22px;vertical-align:middle;">check_circle</span>
            Conferma e invia prenotazione
          </button>
        </div>
      </div>
    </div>
    <div id="modalConferma" class="modal-conferma" style="display:none;">
      <div class="modal-conferma__backdrop"></div>
      <div class="modal-conferma__content">
        <span class="material-icons" style="font-size:32px;color:#37b24d;margin-bottom:10px;">help_outline</span>
        <h4>Conferma prenotazione?</h4>
        <p>Vuoi confermare e inviare definitivamente questa prenotazione?</p>
        <div class="modal-conferma__actions">
          <button id="btnModalAnnulla" class="btn" style="background:#e6e6e6;color:#444;padding:10px 24px;margin-right:14px;">Annulla</button>
          <button id="btnModalInvia" class="btn btn--primary" style="padding:10px 26px;">Conferma e invia</button>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Gestione UI dialog conferma
  const btnConferma = document.getElementById('btnConfermaPrenotazione');
  const modal = document.getElementById('modalConferma');
  if (btnConferma && modal) {
    btnConferma.onclick = () => {
      modal.style.display = 'flex';
    };
    document.getElementById('btnModalAnnulla').onclick = () => {
      modal.style.display = 'none';
    };
    document.getElementById('btnModalInvia').onclick = () => {
      modal.style.display = 'none';
      inviaPrenotazione();
    };
    // Uscita cliccando su sfondo modal
    modal.querySelector('.modal-conferma__backdrop').onclick = () => {
      modal.style.display = 'none';
    };
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const btnApriModulo = document.getElementById('btnApriModulo');
  if (btnApriModulo) {
    btnApriModulo.addEventListener('click', inviaPrenotazione);
  }
});

function mostraThankYou() {
  document.getElementById('mainbox').innerHTML = `
    <div id="thankyou">
      <span style="font-size: 64px;">✅</span>
      <h2>Prenotazione inviata!</h2>
      <p>Riceverai una conferma via email o SMS al numero ${bookingData.cellulare}.</p>
      <p>Grazie per aver scelto Imbriani Noleggio!</p>
      <button onclick="location.reload()" class="btn btn--primary">
        🏠 Torna alla home
      </button>
    </div>
  `;
}

function mostraModuliAutisti() {
  const container = document.getElementById('autisti_container');
  const num = parseInt(document.getElementById('num_autisti').value);
  container.innerHTML = '';

  for (let i = 1; i <= num; i++) {
    container.innerHTML += `<div class="autista">
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
      <input type="text" id="codice_fiscale_${i}" placeholder="RSSMRA80A01H501U" required maxlength="16" style="text-transform: uppercase;" />
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
    </div>`;
  }

  const annoCorrente = new Date().getFullYear();
  for (let i = 1; i <= num; i++) {
    popolaTendineData(`giorno_nascita_${i}`, `mese_nascita_${i}`, `anno_nascita_${i}`, 1940, annoCorrente - 18);
    popolaTendineData(`giorno_inizio_validita_patente_${i}`, `mese_inizio_validita_patente_${i}`, `anno_inizio_validita_patente_${i}`, annoCorrente - 50, annoCorrente + 10);
    popolaTendineData(`giorno_fine_validita_patente_${i}`, `mese_fine_validita_patente_${i}`, `anno_fine_validita_patente_${i}`, annoCorrente, annoCorrente + 15);
  }

  // ✅ PRECOMPILAZIONE COMPLETA + CELLULARE
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

      // ✅ PRECOMPILA CELLULARE
      const cellulareInput = document.getElementById('cellulare');
      if (cellulareInput && dati.cellulare) {
        cellulareInput.value = dati.cellulare;
        console.log('✅ Cellulare precompilato:', dati.cellulare);
      }

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
