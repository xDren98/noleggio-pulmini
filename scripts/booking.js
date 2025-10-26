// booking.js - gestione dati e stato prenotazione

let bookingData = {};

function initBooking() {
  bookingData = {
    step: 1,
    clienti: [],
    dataRitiro: null,
    dataArrivo: null,
    pulminoScelto: null,
    telefono: null,
    // Altri campi...
  };
}

function aggiornaDatiBooking(campo, valore) {
  bookingData[campo] = valore;
}

function getBookingData() {
  return bookingData;
}

export { initBooking, aggiornaDatiBooking, getBookingData };
