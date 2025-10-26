let bookingData = {};

// Inizializza dati prenotazione
function initBooking() {
  bookingData = {
    step: 1,
    clienti: [],
    dateRitiro: null,
    dateConsegna: null,
    pulminoScelto: null,
    // altri dati...
  };
}

// Aggiorna dati prenotazione
function aggiornaDatiBooking(campo, valore) {
  bookingData[campo] = valore;
}

// Recupera dati prenotazione
function getBookingData() {
  return bookingData;
}

export { initBooking, aggiornaDatiBooking, getBookingData };
