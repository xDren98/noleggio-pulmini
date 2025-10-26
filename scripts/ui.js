// ui.js - gestione messaggi, loader e visualizzazione prenotazioni in card
const VERSION = "2.9.0";
console.log(`[ui.js] Versione codice: ${VERSION}`);

// Mostra messaggi di errore
function mostraErrore(msg) {
  const box = document.getElementById('banner_errore');
  if (!box) return;
  box.textContent = msg;
  box.classList.add('show');
  setTimeout(() => box.classList.remove('show'), 5000);
}

// Mostra messaggi di successo
function mostraSuccesso(msg) {
  const box = document.getElementById('banner_successo');
  if (!box) return;
  box.textContent = msg;
  box.classList.add('show');
  setTimeout(() => box.classList.remove('show'), 5000);
}

// Mostra loader mentre si aspetta risposta
function mostraLoading() {
  const loader = document.getElementById('loader');
  if (loader) loader.style.display = 'block';
}

// Nasconde loader
function nascondiLoading() {
  const loader = document.getElementById('loader');
  if (loader) loader.style.display = 'none';
}

// Funzione per mostrare le prenotazioni come card dettagliate nel DOM
function mostraPrenotazioni(prenotazioni) {
  const container = document.getElementById('prenotazioni_container');
  if (!container) return;
  container.innerHTML = ''; // svuota

  if (!Array.isArray(prenotazioni) || prenotazioni.length === 0) {
    container.innerHTML = '<p>Nessuna prenotazione trovata.</p>';
    return;
  }

  prenotazioni.forEach(p => {
    const card = document.createElement('div');
    card.classList.add('prenotazione-card');

    // Aggiungi classi e html contenuto come nell'originale
    const statoClass = p.stato ? p.stato.toLowerCase().replace(/\s+/g, '-') : '';
    card.innerHTML = `
      <h3>${p.nomeCliente || 'Cliente'}</h3>
      <p><b>Dal:</b> ${p.dal || 'N/D'}</p>
      <p><b>Al:</b> ${p.al || 'N/D'}</p>
      <p><b>Veicolo:</b> ${p.targa || 'N/D'}</p>
      <p class="stato ${statoClass}"><b>Stato:</b> ${p.stato || 'N/D'}</p>
    `;

    container.appendChild(card);
  });
}

export { mostraErrore, mostraSuccesso, mostraLoading, nascondiLoading, mostraPrenotazioni };
