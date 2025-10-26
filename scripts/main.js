console.log('Imbriani Noleggio - Versione codice 2.9.0');

import { caricaStatoTemporaneo, cancellaStatoTemporaneo } from './storage.js';
import { validaCodiceFiscale } from './validation.js';
import { mostraErrore, mostraSuccesso, mostraLoading } from './ui.js';
import { fetchDatiCliente } from './api.js';
import { bookingData, loggedCustomerData, caricaStato, resetBooking, controllaDisponibilita, vaiStep3, vaiStep4 } from './booking.js';
import { showStep, popolaDatePicker } from './ui.js';

window.onload = () => {
  if (caricaStato()) {
    mostraSuccesso('Dati caricati dalla sessione precedente.');
  } else {
    resetBooking();
  }

  document.getElementById('mainbox').style.display = 'none';
  document.getElementById('homepage').style.display = 'block';

  popolaDatePicker('ritiro');
  popolaDatePicker('arrivo');

  const loginForm = document.getElementById('loginFormHomepage');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const cfInput = document.getElementById('cfInputHomepage');
      const cf = cfInput.value.trim().toUpperCase();
      if (!cf) {
        mostraErrore('Inserisci un codice fiscale valido.');
        return;
      }
      if (!validaCodiceFiscale(cf)) {
        mostraErrore('Codice fiscale non valido.');
        return;
      }
      mostraLoading(true);
      try {
        const dati = await fetchDatiCliente(cf);
        mostraLoading(false);
        if (dati.success) {
          loggedCustomerData = { cf, datiCompleti: dati.dati };
          mostraSuccesso('Dati cliente caricati con successo.');
          document.getElementById('homepage').style.display = 'none';
          document.getElementById('mainbox').style.display = 'block';
          showStep('step1');
          caricaStatoTemporaneo();
        } else {
          mostraErrore('Nessun cliente trovato con questo codice fiscale, puoi prenotare come nuovo.');
        }
      } catch (err) {
        mostraLoading(false);
        mostraErrore('Errore di rete: ' + err.message);
      }
    });
  }

  const btnNewBooking = document.getElementById('btnNewBooking');
  if (btnNewBooking) {
    btnNewBooking.addEventListener('click', () => {
      document.getElementById('homepage').style.display = 'none';
      document.getElementById('mainbox').style.display = 'block';
      showStep('step1');
      resetBooking();
    });
  }

  const btnCheck = document.getElementById('btnCheckDisponibilita');
  if (btnCheck) btnCheck.addEventListener('click', controllaDisponibilita);

  const btnStep2 = document.getElementById('chiamaContinuaBtn');
  if (btnStep2) btnStep2.addEventListener('click', vaiStep3);

  const btnStep3 = document.getElementById('vaiStep4Btn');
  if (btnStep3) btnStep3.addEventListener('click', vaiStep4);
};
