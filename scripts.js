console.log('Imbriani Noleggio - Versione codice: 2.1.0 - Complete with Data Extraction');

const pulmini = [
  { id: "ducato_lungo", nome: "Fiat Ducato (Passo lungo)", targa: "EC787NM" },
  { id: "ducato_corto", nome: "Fiat Ducato (Passo corto)", targa: "DN391FW" },
  { id: "peugeot", nome: "Peugeot Expert Tepee", targa: "DL291XZ" }
];

let loggedCustomerData = null;
let bookingData = {};

// ============================================
// ✅ CONFIGURAZIONE URL SCRIPTS
// ============================================

const SCRIPTS = {
  proxy: 'https://proxy-cors-google-apps.onrender.com/',
  prenotazioni: 'https://script.google.com/macros/s/AKfycbyMPuvESaAJ7bIraipTya9yUKnyV8eYbm-r8CX42KRvDQsX0f44QBsaqQOY8KVYFBE/exec',
  datiCliente: 'https://script.google.com/macros/s/AKfycbxnC-JSK4YXvV8GF6ED9uK3SSNYs3uAFAmyji6KB_eQ60QAqXIHbTM-18F7-Zu47bo/exec', // ✅ TUO URL
  disponibilita: 'https://script.google.com/macros/s/AKfycbwhEK3IH-hLGYpGXHRjcYdUaW2e3He485XpgcRVr0GBSyE4v4-gSCp5vnSCbn5ocNI/exec'
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

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
  errorDiv.className = 'error-banner';
  errorDiv.innerHTML = `
    <span class="material-icons">error</span>
    <span>${messaggio}</span>
  `;
  document.body.prepend(errorDiv);
  
  setTimeout(() => {
    errorDiv.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => errorDiv.remove(), 300);
  }, 4000);
}

function mostraSuccesso(messaggio) {
  const successDiv = document.createElement('div');
  successDiv.className = 'success-banner';
  successDiv.innerHTML = `
    <span class="material-icons">check_circle</span>
    <span>${messaggio}</span>
  `;
  document.body.prepend(successDiv);
  
  setTimeout(() => {
    successDiv.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => successDiv.remove(), 300);
  }, 4000);
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
        </div>
      `;
      document.body.appendChild(loader);
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
// Aggiungi dopo le utility functions

// Validazione visiva CF in tempo reale
function setupValidazioneVisiva() {
  const cfInputs = document.querySelectorAll('[id^="codice_fiscale_"]');
  
  cfInputs.forEach(input => {
    input.addEventListener('input', function() {
      const value = this.value.trim().toUpperCase();
      this.value = value; // Forza maiuscole
      
      if (value.length === 0) {
        this.classList.remove('valid', 'invalid');
      } else if (value.length === 16 && validaCodiceFiscale(value)) {
        this.classList.remove('invalid');
        this.classList.add('valid');
      } else if (value.length >= 16) {
        this.classList.remove('valid');
        this.classList.add('invalid');
      }
    });
  });
  
  // Validazione telefono
  const telInput = document.getElementById('cellulare');
  if (telInput) {
    telInput.addEventListener('input', function() {
      const value = this.value.replace(/\s/g, '');
      
      if (value.length === 0) {
        this.classList.remove('valid', 'invalid');
      } else if (value.length === 10 && validaTelefono(value)) {
        this.classList.remove('invalid');
        this.classList.add('valid');
      } else if (value.length >= 10) {
        this.classList.remove('valid');
        this.classList.add('invalid');
      }
    });
  }
}

// Chiama dopo generazione form
function mostraModuliAutisti() {
  // ... codice esistente ...
  
  // Alla fine della funzione:
  setupValidazioneVisiva();
}

// ============================================
// LOGIN CLIENTE DA HOMEPAGE - CON ESTRAZIONE DATI
// ============================================

document.getElementById('loginFormHomepage').addEventListener('submit', function(event) {
  event.preventDefault();

  const cf = document.getElementById('cfInputHomepage').value.trim().toUpperCase();
  const loginResult = document.getElementById('loginResultHomepage');
  loginResult.textContent = '';

  if (!validaCodiceFiscale(cf)) {
    mostraErrore('Codice fiscale non valido. Deve essere di 16 caratteri (es: RSSMRA80A01H501U)');
    return;
  }

  mostraLoading(true);

  // ✅ CHIAMATE PARALLELE: prenotazioni + dati cliente
  Promise.all([
    fetch(SCRIPTS.proxy + SCRIPTS.prenotazioni, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cf })
    }).then(r => r.text()).then(t => JSON.parse(t)),
    
    fetch(SCRIPTS.proxy + SCRIPTS.datiCliente, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cf })
    }).then(r => r.text()).then(t => JSON.parse(t))
  ])
  .then(([dataPrenotazioni, dataDatiCliente]) => {
    mostraLoading(false);
    
    console.log('=== DEBUG LOGIN ===');
    console.log('Prenotazioni:', dataPrenotazioni);
    console.log('Dati Cliente:', dataDatiCliente);
    
    // Verifica prenotazioni
    if (!dataPrenotazioni.success) {
      mostraErrore('Errore nel recupero prenotazioni: ' + (dataPrenotazioni.error || 'Errore non specificato'));
      return;
    }
    if (!dataPrenotazioni.prenotazioni || dataPrenotazioni.prenotazioni.length === 0) {
      mostraErrore('Nessuna prenotazione trovata per questo codice fiscale.');
      return;
    }

    // ✅ Salva dati completi del cliente
    loggedCustomerData = {
      cf: cf,
      datiCompleti: dataDatiCliente.success ? dataDatiCliente.cliente : null
    };

    const nomeCliente = loggedCustomerData.datiCompleti?.nomeCognome || '';
    mostraSuccesso(`Benvenuto ${nomeCliente}! Trovate ${dataPrenotazioni.prenotazioni.length} prenotazioni.`);

    let listaPrenotazioniHtml = '<div class="prenotazioni-container"><h3>Le tue prenotazioni:</h3>';

    dataPrenotazioni.prenotazioni.forEach(item => {
      let statoClass = '';
      if (item.stato === 'Prenotato') statoClass = 'status--info';
      else if (item.stato === 'In corso') statoClass = 'status--warning';
      else if (item.stato === 'Completato') statoClass = 'status--success';

      listaPrenotazioniHtml += `
        <div class="card prenotazione-card">
          <div class="card__body">
            <div class="prenotazione-header">
              <span class="material-icons">directions_bus</span>
              <strong>${item.targa || 'N/D'}</strong>
            </div>
            <div class="prenotazione-date">
              <div class="date-item">
                <span class="material-icons">event</span>
                <span><strong>Dal:</strong> ${item.dal || 'N/D'}</span>
              </div>
              <div class="date-item">
                <span class="material-icons">event</span>
                <span><strong>Al:</strong> ${item.al || 'N/D'}</span>
              </div>
            </div>
            <div class="prenotazione-stato">
              <span class="status ${statoClass}">${item.stato || 'N/D'}</span>
            </div>
          </div>
        </div>
      `;
    });

    listaPrenotazioniHtml += '</div><button id="btnNewBookingFromLogin" class="btn btn--primary"><span class="material-icons">add</span> Prenota un nuovo noleggio</button>';

    loginResult.innerHTML = listaPrenotazioniHtml;

    document.getElementById('btnNewBookingFromLogin').addEventListener('click', () => {
      startNewBookingWithPreFill();
    });
  })
  .catch(err => {
    mostraLoading(false);
    console.error('Errore login:', err);
    mostraErrore('Errore durante la ricerca: ' + err.message);
  });
});

// ============================================
// NUOVA PRENOTAZIONE
// ============================================

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

// ============================================
// NAVIGAZIONE STEP
// ============================================

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

// ============================================
// STEP 1: VERIFICA DISPONIBILITÀ
// ============================================

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

// ============================================
// STEP 2 → STEP 3
// ============================================

function vaiStep3() {
  showStep('step3');
  mostraModuliAutisti();
}

// ============================================
// STEP 3: VALIDAZIONE E PASSAGGIO A STEP 4
// ============================================

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
}

// ============================================
// STEP 4: INVIO PRENOTAZIONE
// ============================================

document.addEventListener('DOMContentLoaded', function() {
  const btnApriModulo = document.getElementById('btnApriModulo');
  if (btnApriModulo) {
    btnApriModulo.addEventListener('click', inviaPrenotazione);
  }
});

function inviaPrenotazione() {
  if (!bookingData.pulmino || !bookingData.dataRitiro || !bookingData.autisti) {
    mostraErrore('Dati prenotazione incompleti. Riprova dall\'inizio.');
    return;
  }

  const formId = '11jQAzYFUg2Qgu-XyR5pj9hgzc992ZKeIeaHos2KBk7A';
  const formBaseUrl = `https://docs.google.com/forms/d/e/${formId}/viewform`;

  const ENTRY = {
    nomeCognome1: "entry.1117372864",
    dataNascita1: "entry.1463974346",
    luogoNascita1: "entry.1633665128",
    codiceFiscale1: "entry.36844075",
    comuneResidenza1: "entry.115888402",
    viaResidenza1: "entry.913323396",
    civicoResidenza1: "entry.851213452",
    numeroPatente1: "entry.15925456",
    inizioValiditaPatente1: "entry.914754440",
    fineValiditaPatente1: "entry.1373011243",
    targaPulmino: "entry.1676855906",
    oraRitiro: "entry.821083355",
    oraArrivo: "entry.1888774437",
    dataRitiro: "entry.517585546",
    dataArrivo: "entry.810215127",
    cellulare: "entry.1889382033",
    dataContratto: "entry.1543960408",
    nomeCognome2: "entry.1449762214",
    dataNascita2: "entry.218826991",
    luogoNascita2: "entry.572727319",
    codiceFiscale2: "entry.850104184",
    comuneResidenza2: "entry.702889962",
    viaResidenza2: "entry.1362390417",
    civicoResidenza2: "entry.269416573",
    numeroPatente2: "entry.716259237",
    inizioValiditaPatente2: "entry.1202607650",
    fineValiditaPatente2: "entry.1335171224",
    nomeCognome3: "entry.1756625997",
    dataNascita3: "entry.724642237",
    luogoNascita3: "entry.2055078159",
    codiceFiscale3: "entry.1750806014",
    comuneResidenza3: "entry.559362301",
    viaResidenza3: "entry.656836588",
    civicoResidenza3: "entry.1926018707",
    numeroPatente3: "entry.724642237",
    inizioValiditaPatente3: "entry.2055078159",
    fineValiditaPatente3: "entry.1750806014"
  };

  const params = new URLSearchParams();

  params.append(ENTRY.targaPulmino, bookingData.pulmino.targa);
  params.append(ENTRY.dataRitiro, bookingData.dataRitiro);
  params.append(ENTRY.oraRitiro, bookingData.oraRitiro);
  params.append(ENTRY.dataArrivo, bookingData.dataArrivo);
  params.append(ENTRY.oraArrivo, bookingData.oraArrivo);
  params.append(ENTRY.cellulare, bookingData.cellulare);
  
  const oggi = new Date();
  const dataContratto = `${oggi.getDate().toString().padStart(2, '0')}/${(oggi.getMonth() + 1).toString().padStart(2, '0')}/${oggi.getFullYear()}`;
  params.append(ENTRY.dataContratto, dataContratto);

  const a1 = bookingData.autisti[0];
  params.append(ENTRY.nomeCognome1, a1.nomeCognome);
  params.append(ENTRY.dataNascita1, a1.dataNascita);
  params.append(ENTRY.luogoNascita1, a1.luogoNascita);
  params.append(ENTRY.codiceFiscale1, a1.codiceFiscale);
  params.append(ENTRY.comuneResidenza1, a1.comuneResidenza);
  params.append(ENTRY.viaResidenza1, a1.viaResidenza);
  params.append(ENTRY.civicoResidenza1, a1.civicoResidenza);
  params.append(ENTRY.numeroPatente1, a1.numeroPatente);
  params.append(ENTRY.inizioValiditaPatente1, a1.dataInizioValiditaPatente);
  params.append(ENTRY.fineValiditaPatente1, a1.dataFineValiditaPatente);

  if (bookingData.autisti[1]) {
    const a2 = bookingData.autisti[1];
    params.append(ENTRY.nomeCognome2, a2.nomeCognome);
    params.append(ENTRY.dataNascita2, a2.dataNascita);
    params.append(ENTRY.luogoNascita2, a2.luogoNascita);
    params.append(ENTRY.codiceFiscale2, a2.codiceFiscale);
    params.append(ENTRY.comuneResidenza2, a2.comuneResidenza);
    params.append(ENTRY.viaResidenza2, a2.viaResidenza);
    params.append(ENTRY.civicoResidenza2, a2.civicoResidenza);
    params.append(ENTRY.numeroPatente2, a2.numeroPatente);
    params.append(ENTRY.inizioValiditaPatente2, a2.dataInizioValiditaPatente);
    params.append(ENTRY.fineValiditaPatente2, a2.dataFineValiditaPatente);
  }

  if (bookingData.autisti[2]) {
    const a3 = bookingData.autisti[2];
    params.append(ENTRY.nomeCognome3, a3.nomeCognome);
    params.append(ENTRY.dataNascita3, a3.dataNascita);
    params.append(ENTRY.luogoNascita3, a3.luogoNascita);
    params.append(ENTRY.codiceFiscale3, a3.codiceFiscale);
    params.append(ENTRY.comuneResidenza3, a3.comuneResidenza);
    params.append(ENTRY.viaResidenza3, a3.viaResidenza);
    params.append(ENTRY.civicoResidenza3, a3.civicoResidenza);
    params.append(ENTRY.numeroPatente3, a3.numeroPatente);
    params.append(ENTRY.inizioValiditaPatente3, a3.dataInizioValiditaPatente);
    params.append(ENTRY.fineValiditaPatente3, a3.dataFineValiditaPatente);
  }

  const urlCompleto = `${formBaseUrl}?${params.toString()}`;
  
  const formWindow = window.open(urlCompleto, '_blank');
  
  if (!formWindow) {
    mostraErrore('Pop-up bloccato! Consenti i pop-up per questo sito e riprova.');
    return;
  }
  
  mostraSuccesso('Modulo di prenotazione aperto! Completa l\'invio nella nuova finestra.');
  
  setTimeout(() => {
    if (confirm('Hai completato l\'invio del modulo?\n\nClicca OK se hai inviato, Annulla se devi ancora completare.')) {
      mostraThankYou();
    }
  }, 3000);
}

function mostraThankYou() {
  document.getElementById('mainbox').innerHTML = `
    <div id="thankyou">
      <span class="material-icons" style="font-size: 64px; color: #37b24d;">check_circle</span>
      <h2>Prenotazione inviata!</h2>
      <p>Riceverai una conferma via email o SMS al numero ${bookingData.cellulare}.</p>
      <p>Grazie per aver scelto Imbriani Noleggio!</p>
      <button onclick="location.reload()" class="btn btn--primary">
        <span class="material-icons">home</span>
        Torna alla home
      </button>
    </div>
  `;
}

// ============================================
// GESTIONE MODULI AUTISTI CON PRECOMPILAZIONE
// ============================================

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

  // ✅ PRECOMPILAZIONE COMPLETA DEL PRIMO AUTISTA SE LOGGATO
  if (loggedCustomerData && loggedCustomerData.datiCompleti) {
    setTimeout(() => {
      const dati = loggedCustomerData.datiCompleti;
      
      console.log('=== PRECOMPILAZIONE AUTISTA 1 ===');
      console.log('Dati disponibili:', dati);
      
      const nomeInput = document.getElementById('nome_cognome_1');
      if (nomeInput && dati.nomeCognome) {
        nomeInput.value = dati.nomeCognome;
      }
      
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
      if (luogoInput && dati.luogoNascita) {
        luogoInput.value = dati.luogoNascita;
      }
      
      const cfInput = document.getElementById('codice_fiscale_1');
      if (cfInput && dati.codiceFiscale) {
        cfInput.value = dati.codiceFiscale;
      }
      
      const comuneInput = document.getElementById('comune_residenza_1');
      if (comuneInput && dati.comuneResidenza) {
        comuneInput.value = dati.comuneResidenza;
      }
      
      const viaInput = document.getElementById('via_residenza_1');
      if (viaInput && dati.viaResidenza) {
        viaInput.value = dati.viaResidenza;
      }
      
      const civicoInput = document.getElementById('civico_residenza_1');
      if (civicoInput && dati.civicoResidenza) {
        civicoInput.value = dati.civicoResidenza;
      }
      
      const patenteInput = document.getElementById('numero_patente_1');
      if (patenteInput && dati.numeroPatente) {
        patenteInput.value = dati.numeroPatente;
      }
      
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
      
      mostraSuccesso('Dati del primo autista precompilati automaticamente!');
      console.log('=== FINE PRECOMPILAZIONE ===');
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

// ============================================
// INIZIALIZZAZIONE
// ============================================

window.onload = () => {
  const annoCorrente = new Date().getFullYear();
  popolaTendineData('giorno_ritiro', 'mese_ritiro', 'anno_ritiro', annoCorrente, annoCorrente + 1);
  popolaTendineData('giorno_arrivo', 'mese_arrivo', 'anno_arrivo', annoCorrente, annoCorrente + 1);
  mostraModuliAutisti();

  document.getElementById('num_autisti').addEventListener('change', mostraModuliAutisti);
  
  updateBackButton();
};
