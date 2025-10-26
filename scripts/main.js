// main.js - Entry point dell'app Imbriani Noleggio
const VERSION = "2.9.1"; // aggiorna questa versione se cambia il codice
console.log(`Imbriani Noleggio - Versione codice ${VERSION}`);

import { fetchPrenotazioni, salvaPrenotazione, fetchDisponibilita } from './api.js';
import { salvaStatoTemporaneo, caricaStatoTemporaneo } from './storage.js';
import { mostraErrore, mostraSuccesso, mostraLoading, nascondiLoading } from './ui.js';
import { validaCodiceFiscale, validaTelefono } from './validation.js';
import { initBooking, aggiornaDatiBooking, getBookingData, aggiornaAutisti, setAutista, impostaDatiRiepilogo } from './booking.js';

window.onload = () => {
  initBooking();

  const datiSalvati = caricaStatoTemporaneo();
  if (datiSalvati) {
    aggiornaDatiBooking('salvati', datiSalvati);
    console.log('Stato caricato dal salvataggio temporaneo', datiSalvati);
  }

  document.getElementById('btnNewBooking').addEventListener('click', () => {
    document.getElementById('homepage').style.display = 'none';
    document.getElementById('mainbox').style.display = 'block';
  });

  document.getElementById('verificaDisponibilitaBtn').addEventListener('click', verificaDisponibilita);
  document.getElementById('chiamaContinuaBtn').addEventListener('click', vaiStep3);
  document.getElementById('num_autisti').addEventListener('change', () => {
    aggiornaAutistiContainer();
  });
  document.getElementById('vaiStep4Btn').addEventListener('click', vaiStep4);

  document.getElementById('loginFormHomepage').addEventListener('submit', async (e) => {
    e.preventDefault();

    const cfInput = document.getElementById('cfInputHomepage').value.trim();
    if (!validaCodiceFiscale(cfInput)) {
      mostraErrore('Codice fiscale non valido');
      return;
    }

    mostraLoading();
    try {
      const response = await fetchPrenotazioni({ cf: cfInput });
      nascondiLoading();

      // Controllo che response esista e abbia campo prenotazioni
      if (response && Array.isArray(response.prenotazioni)) {
        const prenotazioni = response.prenotazioni;
        mostraSuccesso(`Trovate ${prenotazioni.length} prenotazioni.`);
        aggiornaDatiBooking('prenotazioni', prenotazioni);
        salvaStatoTemporaneo(getBookingData());

        const loginResultBox = document.getElementById('loginResultHomepage');
        loginResultBox.textContent = `Trovate ${prenotazioni.length} prenotazioni.`;
      } else {
        mostraErrore('Nessuna prenotazione trovata o risposta non valida.');
        console.warn('Response fetchPrenotazioni senza campo prenotazioni', response);
      }
    } catch (err) {
      nascondiLoading();
      mostraErrore('Errore nella ricerca prenotazioni.');
      console.error('Dettaglio errore login:', err.message, err.stack);
    }
  });
};

async function verificaDisponibilita() {
  mostraLoading();

  const giornoRit = document.getElementById('giorno_ritiro').value;
  const meseRit = document.getElementById('mese_ritiro').value;
  const annoRit = document.getElementById('anno_ritiro').value;
  const oraRit = document.getElementById('ora_partenza').value;

  const giornoArr = document.getElementById('giorno_arrivo').value;
  const meseArr = document.getElementById('mese_arrivo').value;
  const annoArr = document.getElementById('anno_arrivo').value;
  const oraArr = document.getElementById('ora_arrivo').value;

  try {
    const params = {
      giornoRit, meseRit, annoRit, oraRit,
      giornoArr, meseArr, annoArr, oraArr
    };

    const response = await fetchDisponibilita(params);
    nascondiLoading();

    if (response && Array.isArray(response)) {
      const disponibilita = response;
      document.getElementById('num_disponibili').textContent = disponibilita.length;
      const scelta = document.getElementById('scelta_pulmino');
      scelta.innerHTML = '';
      disponibilita.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = `${p.nome} - ${p.targa}`;
        scelta.appendChild(option);
      });

      document.getElementById('chiamaContinuaBtn').disabled = false;
    } else {
      mostraErrore('Nessuna disponibilità trovata o risposta non valida.');
    }
  } catch (err) {
    nascondiLoading();
    mostraErrore('Errore nella verifica disponibilità');
    console.error(err);
  }
}

function vaiStep3() {
  const pulminoSel = document.getElementById('scelta_pulmino');
  const pulminoScelto = pulminoSel.options[pulminoSel.selectedIndex];
  aggiornaDatiBooking('pulminoScelto', {
    id: pulminoSel.value,
    nome: pulminoScelto ? pulminoScelto.textContent : ''
  });

  mostraStep('step3');
}

function aggiornaAutistiContainer() {
  const container = document.getElementById('autisti_container');
  container.innerHTML = '';
  const n = parseInt(document.getElementById('num_autisti').value, 10);
  aggiornaAutisti(n);

  for (let i = 1; i <= n; i++) {
    const label = document.createElement('label');
    label.textContent = `Autista ${i} - Nome Cognome:`;
    const input = document.createElement('input');
    input.type = 'text';
    input.id = `autista_nome_${i}`;
    input.placeholder = `Nome e cognome autista ${i}`;
    input.addEventListener('change', () => {
      setAutista(i - 1, input.value);
    });
    container.appendChild(label);
    container.appendChild(input);
  }
}

function vaiStep4() {
  const cellulare = document.getElementById('cellulare').value.trim();
  if (!validaTelefono(cellulare)) {
    mostraErrore('Telefono non valido');
    return;
  }
  aggiornaDatiBooking('telefono', cellulare);

  impostaDatiRiepilogo();

  mostraStep('step4');
}

function mostraStep(stepId) {
  const steps = document.querySelectorAll('.step');
  steps.forEach(step => step.classList.remove('active'));
  document.getElementById(stepId).classList.add('active');
}
