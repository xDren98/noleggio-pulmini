console.log('Imbriani Noleggio - Versione codice: 2.0.0 - Bug Fix');

const pulmini = [
  { id: "ducato_lungo", nome: "Fiat Ducato (Passo lungo)", targa: "EC787NM" },
  { id: "ducato_corto", nome: "Fiat Ducato (Passo corto)", targa: "DN391FW" },
  { id: "peugeot", nome: "Peugeot Expert Tepee", targa: "DL291XZ" }
];

let loggedCustomerData = null;
let bookingData = {}; // Store per dati prenotazione

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

// ============================================
// LOGIN CLIENTE DA HOMEPAGE
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

  const proxyUrl = 'https://proxy-cors-google-apps.onrender.com/';
  const baseScriptUrl = 'https://script.google.com/macros/s/AKfycbyMPuvESaAJ7bIraipTya9yUKnyV8eYbm-r8CX42KRvDQsX0f44QBsaqQOY8KVYFBE/exec';
  const url = proxyUrl + baseScriptUrl;

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ cf })
  })
  .then(response => response.text())
  .then(text => {
    mostraLoading(false);
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      mostraErrore('Risposta non valida dal server');
      return;
    }
    if (!data.success) {
      mostraErrore('Errore dal server: ' + (data.error || 'Errore non specificato'));
      return;
    }
    if (!data.prenotazioni || data.prenotazioni.length === 0) {
      mostraErrore('Nessuna prenotazione trovata per questo codice fiscale.');
      return;
    }

    loggedCustomerData = { cf };
    mostraSuccesso(`Benvenuto! Trovate ${data.prenotazioni.length} prenotazioni.`);

    let listaPrenotazioniHtml = '<div class="prenotazioni-container"><h3>Le tue prenotazioni:</h3>';

    data.prenotazioni.forEach(item => {
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

  // Reset booking data
  bookingData = {};

  if (loggedCustomerData) {
    document.getElementById('num_autisti').value = '1';
    mostraModuliAutisti();
    setTimeout(() => {
      document.getElementById('codice_fiscale_1').value = loggedCustomerData.cf || '';
    }, 100);
  }
}

// ============================================
// NAVIGAZIONE STEP
// ============================================

function showStep(stepId) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  const step = document.getElementById(stepId);
  if (step) step.classList.add('active');
  
  // Update back button visibility
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
  
  // Hide back button on step1 and homepage
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
    // Torna alla homepage
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

  // Controllo che il ritiro sia almeno domani
  const domani = new Date();
  domani.setDate(domani.getDate() + 1);
  domani.setHours(0, 0, 0, 0);
  
  if (dateRitiro < domani) {
    mostraErrore("La data di ritiro deve essere almeno da domani in poi.");
    return;
  }

  // Store booking data
  bookingData.dataRitiro = dataRitiroStr;
  bookingData.oraRitiro = oraRitiro;
  bookingData.dataArrivo = dataArrivoStr;
  bookingData.oraArrivo = oraArrivo;

  mostraLoading(true);

  const proxyUrl = 'https://proxy-cors-google-apps.onrender.com/';
  const scriptDisponibilitaUrl = 'https://script.google.com/macros/s/AKfycbwhEK3IH-hLGYpGXHRjcYdUaW2e3He485XpgcRVr0GBSyE4v4-gSCp5vnSCbn5ocNI/exec';
  const url = proxyUrl + scriptDisponibilitaUrl;

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'getPrenotazioni' })
  })
  .then(response => response.json())
  .then(data => {
    mostraLoading(false);
    
    console.log('=== DEBUG DISPONIBILITÀ ===');
    console.log('Data ricevuta dal backend:', data);
    console.log('Prenotazioni:', data.prenotazioni);
    console.log('Data ritiro richiesta:', dateRitiro);
    console.log('Data arrivo richiesta:', dateArrivo);
    
    if (!data.success) {
      mostraErrore('Errore nel recupero delle prenotazioni: ' + (data.error || 'Errore sconosciuto'));
      return;
    }

    const arrayPrenotazioni = data.prenotazioni;
    
    arrayPrenotazioni.forEach(pren => {
      const inizio = new Date(pren.inizio);
      const fine = new Date(pren.fine);
      console.log(`Prenotazione ${pren.targa}: ${inizio} => ${fine}`);
      console.log(`  Sovrappone? ${!(fine <= dateRitiro || inizio >= dateArrivo)}`);
    });

    const disponibili = pulmini.filter(p => {
      return !arrayPrenotazioni.some(pren => {
        if (pren.targa !== p.targa) return false;
        const inizio = new Date(pren.inizio);
        const fine = new Date(pren.fine);
        const sovrapposizione = !(fine <= dateRitiro || inizio >= dateArrivo);
        console.log(`${p.nome} (${p.targa}) vs Prenotazione ${pren.targa}: sovrapposizione=${sovrapposizione}`);
        return sovrapposizione;
      });
    });
    
    console.log('Pulmini disponibili:', disponibili);
    console.log('=== FINE DEBUG ===');

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
        const pulminoSelezionato = pulmini.find(p => p.id === this.value);
        bookingData.pulmino = pulminoSelezionato;
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

  // Validazione cellulare
  if (!validaTelefono(cellulare)) {
    mostraErrore('Inserisci un numero di cellulare valido (10 cifre)');
    return;
  }

  // Validazione autisti
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

    // Controlli campi vuoti
    if (!nomeCognome || !dataNascita || !luogoNascita || !comuneResidenza || 
        !viaResidenza || !civicoResidenza || !numeroPatente || 
        !dataInizioValiditaPatente || !dataFineValiditaPatente) {
      mostraErrore(`Compila tutti i campi obbligatori per l'autista ${i}`);
      return;
    }

    // Validazione codice fiscale
    if (!validaCodiceFiscale(codiceFiscale)) {
      mostraErrore(`Codice fiscale non valido per l'autista ${i}`);
      return;
    }

    // Validazione nome e cognome (almeno 2 parole)
    if (nomeCognome.split(' ').length < 2) {
      mostraErrore(`Inserisci nome e cognome completi per l'autista ${i}`);
      return;
    }

    // Validazione date patente
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

    // Validazione età (almeno 18 anni)
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

  // Store data
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

  // Costruisci URL Google Form precompilato
  const formBaseUrl = 'https://docs.google.com/forms/d/e/TU_FORM_ID_QUI/viewform';
  
  // Esempio parametri (sostituisci con i tuoi entry ID dal form Google)
  const params = new URLSearchParams({
    'entry.123456': bookingData.pulmino.nome,
    'entry.234567': bookingData.dataRitiro,
    'entry.345678': bookingData.oraRitiro,
    'entry.456789': bookingData.dataArrivo,
    'entry.567890': bookingData.oraArrivo,
    'entry.678901': bookingData.cellulare,
    'entry.789012': bookingData.autisti[0].nomeCognome,
    'entry.890123': bookingData.autisti[0].codiceFiscale
    // Aggiungi altri campi necessari
  });

  const urlCompleto = `${formBaseUrl}?${params.toString()}`;
  
  // Apri in nuova finestra
  window.open(urlCompleto, '_blank');
  
  mostraSuccesso('Modulo di prenotazione aperto! Completa l\'invio nella nuova finestra.');
  
  // Dopo 2 secondi, mostra messaggio di conferma
  setTimeout(() => {
    if (confirm('Hai completato l\'invio del modulo?')) {
      mostraThankYou();
    }
  }, 2000);
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
// GESTIONE MODULI AUTISTI
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
