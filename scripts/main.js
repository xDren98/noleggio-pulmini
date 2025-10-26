// main.js

import { caricaStatoTemporaneo, cancellaStatoTemporaneo } from './storage.js';
import { validaCodiceFiscale } from './validation.js';
import { fetchPrenotazioni, fetchDatiCliente, fetchDisponibilita, salvaPrenotazioneApi } from './api.js';
import { mostraErrore, mostraSuccesso, mostraLoading } from './ui.js';
import { bookingData, loggedCustomerData, caricaStato, resetBooking, controllaDisponibilita, vaiStep3, vaiStep4, confermaPrenotazione, mostraModuliAutisti } from './booking.js';

window.onload = () => {
  if (caricaStato()) {
    mostraSuccesso('Dati caricati dalla sessione precedente.');
  } else {
    resetBooking();
  }

  const btnCheck = document.getElementById('btnCheckDisponibilita');
  if (btnCheck) btnCheck.addEventListener('click', controllaDisponibilita);

  const btnStep2 = document.getElementById('chiamaContinuaBtn');
  if (btnStep2) btnStep2.addEventListener('click', vaiStep3);

  const btnStep3 = document.getElementById('vaiStep4Btn');
  if (btnStep3) btnStep3.addEventListener('click', vaiStep4);

  // Il bottone di conferma prenotazione è creato dinamicamente nel riepilogo con onclick,
  // quindi non serve qui un event listener statico.

  popolaDatePicker('ritiro');
  popolaDatePicker('arrivo');

  // Esempio di fetch dati cliente su login - da abilitare se serve
  /*
  if (loggedCustomerData && loggedCustomerData.cf) {
    mostraLoading(true);
    fetchDatiCliente(loggedCustomerData.cf)
      .then(data => {
        mostraLoading(false);
        if (data.success) {
          loggedCustomerData.datiCompleti = data.dati;
          mostraSuccesso('Dati cliente caricati');
        } else {
          mostraErrore('Impossibile caricare dati cliente');
        }
      })
      .catch(err => {
        mostraLoading(false);
        mostraErrore('Errore caricamento dati cliente: ' + err.message);
      });
  }
  */
};

function popolaDatePicker(prefisso) {
  const giornoSelect = document.getElementById(`giorno_${prefisso}`);
  const meseSelect = document.getElementById(`mese_${prefisso}`);
  const annoSelect = document.getElementById(`anno_${prefisso}`);

  if (!giornoSelect || !meseSelect || !annoSelect) return;
  giornoSelect.innerHTML = '<option value="">gg</option>';
  meseSelect.innerHTML = '<option value="">mm</option>';
  annoSelect.innerHTML = '<option value="">aaaa</option>';

  for (let g = 1; g <= 31; g++) {
    giornoSelect.innerHTML += `<option value="${g.toString().padStart(2, '0')}">${g.toString().padStart(2, '0')}</option>`;
  }
  for (let m = 1; m <= 12; m++) {
    meseSelect.innerHTML += `<option value="${m.toString().padStart(2, '0')}">${m.toString().padStart(2, '0')}</option>`;
  }
  const annoCorrente = new Date().getFullYear();
  for (let a = annoCorrente; a >= annoCorrente - 100; a--) {
    annoSelect.innerHTML += `<option value="${a}">${a}</option>`;
  }
}
