// Importa moduli
import { fetchPrenotazioni, salvaPrenotazione } from './api.js';
import { salvaStatoTemporaneo, caricaStatoTemporaneo, cancellaStatoTemporaneo } from './storage.js';
import { mostraErrore, mostraSuccesso, mostraLoading, nascondiLoading } from './ui.js';
import { validaCodiceFiscale, validaTelefono, validaNomeCognome } from './validation.js';
import { initBooking, aggiornaDatiBooking, getBookingData } from './booking.js';

// Inizializzazione all'avvio
window.onload = () => {
  initBooking();

  const datiSalvati = caricaStatoTemporaneo();
  if (datiSalvati) {
    aggiornaDatiBooking('salvati', datiSalvati);
    console.log('Stato caricato dal salvataggio temporaneo', datiSalvati);
  }
};

// Esempio evento submit form login
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
    // aggiorna UI con prenotazioni
  } catch (err) {
    nascondiLoading();
    mostraErrore('Errore nella ricerca prenotazioni.');
    console.error(err);
  }
});
