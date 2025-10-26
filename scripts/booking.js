import { salvaStatoTemporaneo, cancellaStatoTemporaneo } from './storage.js';
import { mostraErrore, mostraSuccesso, mostraLoading, mostraAvvisoContatto, showStep, aggiornaIndicatoreProgresso, nascondiIndicatoreProgresso } from './ui.js';
import { validaTelefono, validaNomeCognome, validaCivico, validaCodiceFiscale, validaDataReale, verificaDuplicatiCF } from './validation.js';
import { pulmini, SCRIPTS } from './api.js';

export let loggedCustomerData = null;
export let bookingData = {};

export function resetBooking() {
  bookingData = {};
  cancellaStatoTemporaneo();
}

export function caricaStato() {
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

export async function controllaDisponibilita() {
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

  bookingData.dataRitiro = dataRitiroStr;
  bookingData.oraRitiro = oraRitiro;
  bookingData.dataArrivo = dataArrivoStr;
  bookingData.oraArrivo = oraArrivo;
  salvaStatoTemporaneo(bookingData);

  mostraLoading(true);
  try {
    const response = await fetch(SCRIPTS.proxy + SCRIPTS.disponibilita, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getPrenotazioni' })
    });
    const data = await response.json();
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
        return !(fine < dateRitiro || inizio > dateArrivo);
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
        salvaStatoTemporaneo(bookingData);
        mostraAvvisoContatto();
      }
    });
  } catch (err) {
    mostraLoading(false);
    mostraErrore('Errore durante il controllo disponibilità: ' + err.message);
  }
}

export function vaiStep3() {
  showStep('step3');
  mostraModuliAutisti();
}

export function vaiStep4() {
  const numAutisti = parseInt(document.getElementById('num_autisti').value);
  const cellulare = document.getElementById('cellulare').value.trim();
  if (!validaTelefono(cellulare)) {
    mostraErrore('Inserisci un numero di cellulare valido (10 cifre)');
    return;
  }

  const checkDuplicati = verificaDuplicatiCF(numAutisti, i => document.getElementById(`codice_fiscale_${i}`).value.trim().toUpperCase());
  if (!checkDuplicati.valid) {
    mostraErrore(`Codice fiscale duplicato: ${checkDuplicati.duplicato}. Ogni autista deve avere un CF univoco.`);
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

    if (
      !nomeCognome || !dataNascita || !luogoNascita || !comuneResidenza ||
      !viaResidenza || !civicoResidenza || !numeroPatente ||
      !dataInizioValiditaPatente || !dataFineValiditaPatente
    ) {
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

  salvaStatoTemporaneo(bookingData);
  mostraSuccesso('Dati validati con successo!');
  mostraRiepilogo();
  showStep('step4');
}

export function mostraRiepilogo() {
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

export async function confermaPrenotazione() {
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

  try {
    const response = await fetch(SCRIPTS.proxy + SCRIPTS.salvaPrenotazione, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prenotazioneData)
    });
    const result = await response.json();
    mostraLoading(false);

    if (result.success) {
      cancellaStatoTemporaneo();
      mostraSuccesso('Prenotazione salvata con successo!');
      setTimeout(() => mostraThankYou(), 1000);
    } else {
      mostraErrore('Errore durante il salvataggio: ' + (result.error || 'Errore sconosciuto'));
    }
  } catch (err) {
    mostraLoading(false);
    mostraErrore('Errore di connessione: ' + err.message);
  }
}

function mostraThankYou() {
  nascondiIndicatoreProgresso();
  const cfPrimoAutista = bookingData.autisti[0].codiceFiscale;
  document.getElementById('mainbox').innerHTML = `
    <div id="thankyou" style="text-align: center; padding: 40px; animation: fadeIn 0.5s ease-in;">
      <span style="font-size: 80px;">🎉</span>
      <h2 style="margin: 20px 0;">Prenotazione Confermata!</h2>
      <p style="font-size: 18px; margin: 20px 0;">Grazie per aver scelto <strong>Imbriani Noleggio</strong></p>
      <div style="background: var(--color-bg-1); padding: 20px; border-radius: 12px; margin: 30px 0; border: 1px solid var(--color-border);">
        <p style="margin: 0;"><strong>📋 Riepilogo:</strong></p>
        <p style="margin: 8px 0; font-size: 16px;">${bookingData.pulmino.nome}</p>
        <p style="margin: 5px 0;">🚗 Targa: <strong>${bookingData.pulmino.targa}</strong></p>
        <p style="margin: 5px 0;">📅 Dal ${bookingData.dataRitiro} alle ${bookingData.oraRitiro}</p>
        <p style="margin: 5px 0;">📅 Al ${bookingData.dataArrivo} alle ${bookingData.oraArrivo}</p>
        <p style="margin: 5px 0;">📱 Contatto: <strong>${bookingData.cellulare}</strong></p>
      </div>
      <div style="background: var(--color-bg-3); padding: 24px; border-radius: 12px; margin: 30px 0; border: 1px solid var(--color-success); text-align: left;">
        <h3 style="margin: 0 0 16px 0; display: flex; align-items: center; gap: 8px;">
          <span class="material-icons" style="color: var(--color-success);">info</span>Gestisci la tua prenotazione
        </h3>
        <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6;">
          Puoi <strong>visualizzare, verificare e gestire</strong> la tua prenotazione in qualsiasi momento accedendo alla homepage con il tuo Codice Fiscale:
        </p>
        <div style="background: var(--color-surface); padding: 16px; border-radius: 8px; margin: 12px 0; border: 2px dashed var(--color-success);">
          <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: var(--color-text-secondary); text-transform: uppercase;">Il tuo Codice Fiscale</p>
          <p style="margin: 0; font-size: 20px; font-weight: 700; font-family: monospace; color: var(--color-primary); letter-spacing: 2px;">${cfPrimoAutista}</p>
        </div>
        <p style="margin: 12px 0 0 0; font-size: 13px; color: var(--color-text-secondary);">
          💡 <strong>Suggerimento:</strong> Salva questo codice per accedere rapidamente alle tue prenotazioni
        </p>
      </div>
      <button onclick="location.reload()" class="btn btn--primary btn--lg" style="margin-top: 20px;">
        <span class="material-icons">home</span> Torna alla Home
      </button>
    </div>`;
}

// Funzioni di utilità
function getData(prefix) {
  const gg = document.getElementById('giorno_' + prefix)?.value;
  const mm = document.getElementById('mese_' + prefix)?.value;
  const aa = document.getElementById('anno_' + prefix)?.value;
  return gg && mm && aa ? `${gg}/${mm}/${aa}` : '';
}

function getDataAutista(tipo, i) {
  const gg = document.getElementById(`giorno_${tipo}_${i}`)?.value;
  const mm = document.getElementById(`mese_${tipo}_${i}`)?.value;
  const aa = document.getElementById(`anno_${tipo}_${i}`)?.value;
  return gg && mm && aa ? `${gg}/${mm}/${aa}` : '';
}

function convertDateToIso(dateEuro) {
  const parts = dateEuro.split('/');
  if (parts.length !== 3) return '';
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

// Funzione per popolare i moduli autisti dinamicamente
export function mostraModuliAutisti() {
  const container = document.getElementById('autisti_container');
  const num = parseInt(document.getElementById('num_autisti').value);
  container.innerHTML = '';
  for (let i = 1; i <= num; i++) {
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
      </div>
    `;
  }

  const annoCorrente = new Date().getFullYear();
  for (let i = 1; i <= num; i++) {
    popolaTendineData(`giorno_nascita_${i}`, `mese_nascita_${i}`, `anno_nascita_${i}`, 1940, annoCorrente - 18);
    popolaTendineData(`giorno_inizio_validita_patente_${i}`, `mese_inizio_validita_patente_${i}`, `anno_inizio_validita_patente_${i}`, annoCorrente - 50, annoCorrente + 10);
    popolaTendineData(`giorno_fine_validita_patente_${i}`, `mese_fine_validita_patente_${i}`, `anno_fine_validita_patente_${i}`, annoCorrente, annoCorrente + 15);

    aggiungiIndicatore(`nome_cognome_${i}`, 'nome');
    aggiungiIndicatore(`codice_fiscale_${i}`, 'cf');
    aggiungiIndicatore(`civico_residenza_${i}`, 'civico');
  }

  aggiungiIndicatore('cellulare', 'tel');

  if (loggedCustomerData && loggedCustomerData.datiCompleti) {
    setTimeout(() => {
      const dati = loggedCustomerData.datiCompleti;
      console.log('=== PRECOMPILAZIONE AUTISTA 1 + CELLULARE ===', dati);

      const nomeInput = document.getElementById('nome_cognome_1');
      if (nomeInput && dati.nomeCognome) nomeInput.value = dati.nomeCognome;

      if (dati.dataNascita) {
        const [gg, mm, aaaa] = dati.dataNascita.split('/');
        document.getElementById('giorno_nascita_1').value = gg;
        document.getElementById('mese_nascita_1').value = mm;
        document.getElementById('anno_nascita_1').value = aaaa;
      }

      if (dati.luogoNascita) document.getElementById('luogo_nascita_1').value = dati.luogoNascita;
      if (dati.codiceFiscale) document.getElementById('codice_fiscale_1').value = dati.codiceFiscale;
      if (dati.comuneResidenza) document.getElementById('comune_residenza_1').value = dati.comuneResidenza;
      if (dati.viaResidenza) document.getElementById('via_residenza_1').value = dati.viaResidenza;
      if (dati.civicoResidenza) document.getElementById('civico_residenza_1').value = dati.civicoResidenza;
      if (dati.numeroPatente) document.getElementById('numero_patente_1').value = dati.numeroPatente;

      if (dati.dataInizioValiditaPatente) {
        const [gg, mm, aaaa] = dati.dataInizioValiditaPatente.split('/');
        document.getElementById('giorno_inizio_validita_patente_1').value = gg;
        document.getElementById('mese_inizio_validita_patente_1').value = mm;
        document.getElementById('anno_inizio_validita_patente_1').value = aaaa;
      }

      if (dati.dataFineValiditaPatente) {
        const [gg, mm, aaaa] = dati.dataFineValiditaPatente.split('/');
        document.getElementById('giorno_fine_validita_patente_1').value = gg;
        document.getElementById('mese_fine_validita_patente_1').value = mm;
        document.getElementById('anno_fine_validita_patente_1').value = aaaa;
      }

      if (dati.cellulare) {
        document.getElementById('cellulare').value = dati.cellulare;
        console.log('✅ Cellulare precompilato:', dati.cellulare);
      }
      mostraSuccesso('Dati del primo autista e cellulare precompilati automaticamente!');
    }, 150);
  }
}
