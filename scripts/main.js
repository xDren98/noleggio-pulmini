// main.js - Entry point dell'app Imbriani Noleggio

// Import moduli
import { fetchPrenotazioni, salvaPrenotazione, fetchDisponibilita } from './api.js';
import { salvaStatoTemporaneo, caricaStatoTemporaneo, cancellaStatoTemporaneo } from './storage.js';
import { mostraErrore, mostraSuccesso, mostraLoading, nascondiLoading } from './ui.js';
import { validaCodiceFiscale, validaTelefono, validaNomeCognome } from './validation.js';
import { initBooking, aggiornaDatiBooking, getBookingData } from './booking.js';

window.onload = () => {
  initBooking();

  const datiSalvati = caricaStatoTemporaneo();
  if (datiSalvati) {
    aggiornaDatiBooking('salvati', datiSalvati);
    console.log('Stato caricato dal salvataggio temporaneo', datiSalvati);
  }

  // Mostra prenotazione se clicchi 'Prenota ora'
  document.getElementById('btnNewBooking').addEventListener('click', () => {
    document.getElementById('homepage').style.display = 'none';
    document.getElementById('mainbox').style.display = 'block';
  });

  // Verifica disponibilità
  document.getElementById('verificaDisponibilitaBtn').addEventListener('click', verificaDisponibilita);

  // Continua a step 3
  document.getElementById('chiamaContinuaBtn').addEventListener('click', vaiStep3);

  // Cambia numero autisti e aggiorna UI
  document.getElementById('num_autisti').addEventListener('change', () => {
    aggiornaAutistiContainer();
  });

  // Continua a step 4
  document.getElementById('vaiStep4Btn').addEventListener('click', vaiStep4);

  // Form login
  document.getElementById('loginFormHomepage').addEventListener('submit', async (e) => {
    e.preventDefault();

    const cfInput = document.getElementById('cfInputHomepage').value.trim();
    if (!validaCodiceFiscale(cfInput)) {
      mostraErrore('Codice fiscale non valido');
      return;
    }

    mostraLoading();
    try {
      const prenotazioni = await fetchPrenotazioni({ cf: cfInput });
      nascondiLoading();
      mostraSuccesso(`Trovate ${prenotazioni.length} prenotazioni.`);
      aggiornaDatiBooking('prenotazioni', prenotazioni);
      salvaStatoTemporaneo(getBookingData());
      // TODO: Aggiorna UI con prenotazioni ricevute
    } catch (err) {
      nascondiLoading();
      mostraErrore('Errore nella ricerca prenotazioni.');
      console.error(err);
    }
  });
};

// Funzione per gestire verifica disponibilità
async function verificaDisponibilita() {
  mostraLoading();

  // Preleva le date e orari selezionati
  const giornoRit = document.getElementById('giorno_ritiro').value;
  const meseRit = document.getElementById('mese_ritiro').value;
  const annoRit = document.getElementById('anno_ritiro').value;
  const oraRit = document.getElementById('ora_partenza').value;

  const giornoArr = document.getElementById('giorno_arrivo').value;
  const meseArr = document.getElementById('mese_arrivo').value;
  const annoArr = document.getElementById('anno_arrivo').value;
  const oraArr = document.getElementById('ora_arrivo').value;

  // TODO: Costruire oggetto date/ora e validare correttezza

  try {
    // Esempio chiamata disponibilità (sostituisci con logica reale)
    const params = {
      giornoRit, meseRit, annoRit, oraRit,
      giornoArr, meseArr, annoArr, oraArr
    };

    const disponibilita = await fetchDisponibilita(params);
    nascondiLoading();

    // Aggiorna UI con numero e pulmini disponibili
    document.getElementById('num_disponibili').textContent = disponibilita.length;
    const scelta = document.getElementById('scelta_pulmino');
    scelta.innerHTML = '';
    disponibilita.forEach(p => {
      const option = document.createElement('option');
      option.value = p.id;
      option.textContent = `${p.nome} - ${p.targa}`;
      scelta.appendChild(option);
    });

    // Abilita il bottone continua
    document.getElementById('chiamaContinuaBtn').disabled = false;
  } catch (err) {
    nascondiLoading();
    mostraErrore('Errore nella verifica disponibilità');
    console.error(err);
  }
}

// Funzione per avanzare allo step 3
function vaiStep3() {
  mostraStep('step3');
}

// Aggiorna container autisti in base al numero selezionato
function aggiornaAutistiContainer() {
  const container = document.getElementById('autisti_container');
  container.innerHTML = '';
  const n = parseInt(document.getElementById('num_autisti').value, 10);

  for (let i = 1; i <= n; i++) {
    const label = document.createElement('label');
    label.textContent = `Autista ${i} - Nome Cognome:`;
    const input = document.createElement('input');
    input.type = 'text';
    input.id = `autista_nome_${i}`;
    input.placeholder = `Nome e cognome autista ${i}`;
    container.appendChild(label);
    container.appendChild(input);
  }
}

// Avanza allo step 4 (riepilogo dati)
function vaiStep4() {
  // TODO: raccogliere dati da form e popolare riepilogo
  mostraStep('step4');
}

// Funzione generica per nascondere tutti gli step e mostrare quello selezionato
function mostraStep(stepId) {
  const steps = document.querySelectorAll('.step');
  steps.forEach(step => step.classList.remove('active'));
  document.getElementById(stepId).classList.add('active');
}
