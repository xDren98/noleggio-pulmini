console.log('Imbriani Noleggio - Versione codice: 1.2.1');

const pulmini = [
  { id: "ducato_lungo", nome: "Fiat Ducato (Passo lungo)", targa: "EC787NM" },
  { id: "ducato_corto", nome: "Fiat Ducato (Passo corto)", targa: "DN391FW" },
  { id: "peugeot", nome: "Peugeot Expert Tepee", targa: "DL291XZ" }
];

let loggedCustomerData = null;

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

// LOGIN CLIENTE DA HOMEPAGE
document.getElementById('loginFormHomepage').addEventListener('submit', function(event) {
  event.preventDefault();

  const cf = document.getElementById('cfInputHomepage').value.trim().toUpperCase();
  const loginResult = document.getElementById('loginResultHomepage');
  loginResult.textContent = '';

  if (!cf || cf.length !== 16) {
    loginResult.textContent = 'Inserisci un codice fiscale valido di 16 caratteri.';
    return;
  }

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
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      loginResult.textContent = 'Risposta non valida dal server: ' + text;
      return;
    }
    if (!data.success) {
      loginResult.textContent = 'Errore dal server: ' + (data.error || 'Errore non specificato');
      return;
    }
    if (!data.prenotazioni || data.prenotazioni.length === 0) {
      loginResult.textContent = 'Nessuna prenotazione trovata per questo codice fiscale.';
      return;
    }

    loggedCustomerData = { cf };

    let listaPrenotazioniHtml = '<div class="prenotazioni-container"><h3>Prenotazioni trovate:</h3>';

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
    loginResult.textContent = 'Errore durante la ricerca: ' + err.message;
  });
});

document.getElementById('btnNewBooking').addEventListener('click', () => {
  loggedCustomerData = null;
  startNewBookingWithPreFill();
});

function startNewBookingWithPreFill() {
  document.getElementById('homepage').style.display = 'none';
  const mainbox = document.getElementById('mainbox');
  mainbox.style.display = 'flex';
  showStep('step1');

  if (loggedCustomerData) {
    document.getElementById('num_autisti').value = '1';
    mostraModuliAutisti();
    document.getElementById('codice_fiscale_1').value = loggedCustomerData.cf || '';
  }
}

function showStep(stepId) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  const step = document.getElementById(stepId);
  if (step) step.classList.add('active');
}

function goBack() {
  if (document.getElementById('step4').classList.contains('active')) showStep('step3');
  else if (document.getElementById('step3').classList.contains('active')) showStep('step2');
  else if (document.getElementById('step2').classList.contains('active')) showStep('step1');
}

function controllaDisponibilita() {
  const dataRitiroStr = getData('ritiro');
  const oraRitiro = document.getElementById('ora_partenza').value;
  const dataArrivoStr = getData('arrivo');
  const oraArrivo = document.getElementById('ora_arrivo').value;

  if (!dataRitiroStr || !oraRitiro || !dataArrivoStr || !oraArrivo) {
    alert('Inserisci data e ora validi.');
    return;
  }

  const dateRitiro = new Date(`${dataRitiroStr.split('/')[2]}-${dataRitiroStr.split('/')[1]}-${dataRitiroStr.split('/')[0]}T${oraRitiro}`);
  const dateArrivo = new Date(`${dataArrivoStr.split('/')[2]}-${dataArrivoStr.split('/')[1]}-${dataArrivoStr.split('/')[0]}T${oraArrivo}`);

  if (dateRitiro >= dateArrivo) {
    alert("La data/ora di arrivo deve essere successiva a quella di ritiro.");
    return;
  }

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
    console.log('=== DEBUG DISPONIBILITÀ ===');
    console.log('Data ricevuta dal backend:', data);
    console.log('Prenotazioni:', data.prenotazioni);
    console.log('Data ritiro richiesta:', dateRitiro);
    console.log('Data arrivo richiesta:', dateArrivo);
    
    if (!data.success) {
      alert('Errore nel recupero delle prenotazioni: ' + (data.error || 'Errore sconosciuto'));
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
      alert('Nessun pulmino disponibile per la fascia selezionata!');
      return;
    }
    showStep('step2');
    const continuaBtn = document.getElementById('chiamaContinuaBtn');
    continuaBtn.disabled = true;

    select.addEventListener('change', function () {
      continuaBtn.disabled = !this.value;
    });
  })
  .catch(err => {
    alert('Errore durante il controllo disponibilità: ' + err.message);
  });
}

function vaiStep3() {
  showStep('step3');
  mostraModuliAutisti();
}

function vaiStep4() {
  showStep('step4');
}

function mostraModuliAutisti() {
  const container = document.getElementById('autisti_container');
  const num = parseInt(document.getElementById('num_autisti').value);
  container.innerHTML = '';
  for (let i = 1; i <= num; i++) {
    container.innerHTML += `<div class="autista">
      <h3>Autista ${i}</h3>
      <label>Nome e Cognome</label><input type="text" id="nome_cognome_${i}" required />
      <label>Data di nascita</label>
      <div class="date-inline">
        <select id="giorno_nascita_${i}"></select>
        <select id="mese_nascita_${i}"></select>
        <select id="anno_nascita_${i}"></select>
      </div>
      <label>Luogo di nascita</label><input type="text" id="luogo_nascita_${i}" required />
      <label>Comune di residenza</label><input type="text" id="comune_residenza_${i}" required />
      <label>Via di residenza</label><input type="text" id="via_residenza_${i}" required />
      <label>Civico di residenza</label><input type="text" id="civico_residenza_${i}" required />
      <label>Codice fiscale</label><input type="text" id="codice_fiscale_${i}" required />
      <label>Numero patente</label><input type="text" id="numero_patente_${i}" required />
      <label>Data inizio validità patente</label>
      <div class="date-inline">
        <select id="giorno_inizio_validita_patente_${i}"></select>
        <select id="mese_inizio_validita_patente_${i}"></select>
        <select id="anno_inizio_validita_patente_${i}"></select>
      </div>
      <label>Data fine validità patente</label>
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

window.onload = () => {
  const annoCorrente = new Date().getFullYear();
  popolaTendineData('giorno_ritiro', 'mese_ritiro', 'anno_ritiro', annoCorrente, annoCorrente + 1);
  popolaTendineData('giorno_arrivo', 'mese_arrivo', 'anno_arrivo', annoCorrente, annoCorrente + 1);
  mostraModuliAutisti();

  document.getElementById('btnNewBooking').addEventListener('click', () => {
    loggedCustomerData = null;
    startNewBookingWithPreFill();
  });

  document.getElementById('num_autisti').addEventListener('change', mostraModuliAutisti);
};
