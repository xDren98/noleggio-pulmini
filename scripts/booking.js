// booking.js - gestione dati, stato prenotazione e riepilogo

let bookingData = {};

function initBooking() {
  bookingData = {
    step: 1,
    clienti: [],
    dataRitiro: null,
    oraRitiro: null,
    dataArrivo: null,
    oraArrivo: null,
    pulminoScelto: null,
    numAutisti: 1,
    autisti: [],
    telefono: null,
  };
}

function aggiornaDatiBooking(campo, valore) {
  bookingData[campo] = valore;
}

function getBookingData() {
  return bookingData;
}

function aggiornaAutisti(num) {
  bookingData.numAutisti = num;
  bookingData.autisti = [];
  for (let i = 0; i < num; i++) {
    bookingData.autisti.push({ nome: "", cognome: "" });
  }
}

function setAutista(index, nomeCognome) {
  if (bookingData.autisti[index]) {
    // Divide nome e cognome da stringa (semplice split per ora)
    const parts = nomeCognome.trim().split(' ');
    bookingData.autisti[index].nome = parts[0] || "";
    bookingData.autisti[index].cognome = parts.slice(1).join(' ') || "";
  }
}

function impostaDatiRiepilogo() {
  let riepilogoHtml = `
    <ul>
      <li><strong>Data e ora ritiro:</strong> ${bookingData.dataRitiro} - ${bookingData.oraRitiro}</li>
      <li><strong>Data e ora arrivo:</strong> ${bookingData.dataArrivo} - ${bookingData.oraArrivo}</li>
      <li><strong>Pulmino scelto:</strong> ${bookingData.pulminoScelto ? bookingData.pulminoScelto.nome : ''}</li>
      <li><strong>Numero autisti:</strong> ${bookingData.numAutisti}</li>
      <li><strong>Autisti:</strong><ul>`;

  bookingData.autisti.forEach((a, i) => {
    riepilogoHtml += `<li>Autista ${i + 1}: ${a.nome} ${a.cognome}</li>`;
  });
  riepilogoHtml += `</ul></li>`;

  riepilogoHtml += `<li><strong>Telefono:</strong> ${bookingData.telefono}</li></ul>`;

  // Imposta contenuto div riepilogo
  const container = document.getElementById('riepilogo_container');
  if (container) container.innerHTML = riepilogoHtml;
}

export {
  initBooking,
  aggiornaDatiBooking,
  getBookingData,
  aggiornaAutisti,
  setAutista,
  impostaDatiRiepilogo,
};
