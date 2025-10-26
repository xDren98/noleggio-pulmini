// main.js - Entry point dell'app Imbriani Noleggio

// Import moduli (assicurati di aver creato i file corrispondenti in scripts/)
import { fetchPrenotazioni, salvaPrenotazione, fetchDisponibilita } from './api.js';
import { salvaStatoTemporaneo, caricaStatoTemporaneo, cancellaStatoTemporaneo } from './storage.js';
import { mostraErrore, mostraSuccesso, mostraLoading, nascondiLoading } from './ui.js';
import { validaCodiceFiscale, validaTelefono, validaNomeCognome } from './validation.js';
import { initBooking, aggiornaDatiBooking, getBookingData } from './booking.js';

window.onload = () => {
  initBooking();

  // Carica stato da storage locale
  const datiSalvati = caricaStatoTemporaneo();
  if (datiSalvati) {
    aggiornaDatiBooking('salvati', datiSalvati);
    console.log('Stato caricato dal salvataggio temporaneo', datiSalvati);
  }
};

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

// Qui puoi aggiungere altri event listeners e iniziative

